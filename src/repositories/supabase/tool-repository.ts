import 'server-only';
import type { CampusId, ToolId, ToolVersionId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import type {
  AutomationTool,
  AutomationToolVersion,
  ToolAttachment,
  ToolStatus,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import { TOOL_STATUSES } from '@/domain/tool/types';
import type { ToolQueryFilters, ToolRepository, ToolSortKey } from '../types';
import { getUserClient, throwOnError } from './client';
import {
  fromTool,
  fromToolCosts,
  fromToolMetrics,
  fromToolVersion,
  toAttachment,
  toStatusHistory,
  toTool,
  toToolVersion,
} from './mappers';

const TOOL_SELECT = '*, tool_developers(user_id), tool_tag_relations(tool_tags(name))';
const VERSION_SELECT =
  '*, tool_integrations(*), tool_data_classifications(*), tool_costs(*), tool_metrics(*)';

function sortColumn(sort: ToolSortKey): { column: string; ascending: boolean } {
  switch (sort) {
    case 'NAME':
      return { column: 'name', ascending: true };
    case 'STATUS':
      return { column: 'status', ascending: true };
    // 평가 기준 정렬은 집계가 필요하다. 1단계에서는 최신순으로 대체하고,
    // 실제 적용 시 평균 점수를 담은 뷰를 만들어 이 부분을 교체한다.
    case 'EVALUATION':
    case 'RECENT':
    default:
      return { column: 'updated_at', ascending: false };
  }
}

export function createSupabaseToolRepository(): ToolRepository {
  return {
    async listTools(
      filters: ToolQueryFilters,
      sort: ToolSortKey,
      page: PageRequest,
    ): Promise<Page<AutomationTool>> {
      const supabase = await getUserClient();
      const from = (page.page - 1) * page.pageSize;
      const to = from + page.pageSize - 1;

      let query = supabase
        .from('automation_tools')
        .select(TOOL_SELECT, { count: 'exact' })
        .eq('campus_id', filters.campusId);

      if (!filters.includeDeleted) query = query.is('deleted_at', null);
      if (filters.statuses?.length) query = query.in('status', filters.statuses as string[]);
      if (filters.categoryIds?.length) {
        query = query.in('category_id', [...filters.categoryIds]);
      }
      if (filters.departmentIds?.length) {
        query = query.in('department_id', [...filters.departmentIds]);
      }
      if (filters.involvingUserId) {
        query = query.or(
          `owner_user_id.eq.${filters.involvingUserId},created_by.eq.${filters.involvingUserId}`,
        );
      }
      if (filters.keyword) {
        const escaped = filters.keyword.replace(/[%,()]/g, ' ').trim();
        if (escaped) query = query.or(`name.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
      }
      if (filters.dataClassifications?.length) {
        // 분류는 버전 하위 테이블에 있으므로 해당 조건을 만족하는 버전의 tool_id 를 먼저 구한다.
        const { data: versionRows, error: versionError } = await supabase
          .from('tool_data_classifications')
          .select('tool_version_id, automation_tool_versions(tool_id)')
          .eq('in_use', true)
          .in('classification', filters.dataClassifications as string[]);
        throwOnError(versionError, '데이터 분류 필터 조회');

        const toolIds = Array.from(
          new Set(
            (versionRows ?? [])
              .map((row) => {
                const version = row.automation_tool_versions;
                const record = Array.isArray(version) ? version[0] : version;
                return (record as { tool_id?: string } | undefined)?.tool_id;
              })
              .filter((id): id is string => Boolean(id)),
          ),
        );

        if (toolIds.length === 0) {
          return { items: [], page: page.page, pageSize: page.pageSize, totalItems: 0, totalPages: 1 };
        }
        query = query.in('id', toolIds);
      }

      const order = sortColumn(sort);
      const { data, error, count } = await query
        .order(order.column, { ascending: order.ascending })
        .range(from, to);
      throwOnError(error, '도구 목록 조회');

      const totalItems = count ?? 0;
      return {
        items: (data ?? []).map(toTool),
        page: page.page,
        pageSize: page.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / page.pageSize)),
      };
    },

    async countByStatus(campusId: CampusId): Promise<Record<ToolStatus, number>> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tools')
        .select('status')
        .eq('campus_id', campusId)
        .is('deleted_at', null);
      throwOnError(error, '도구 상태 집계');

      const counts = Object.fromEntries(TOOL_STATUSES.map((status) => [status, 0])) as Record<
        ToolStatus,
        number
      >;
      for (const row of data ?? []) {
        const status = row.status as ToolStatus;
        if (status in counts) counts[status] += 1;
      }
      return counts;
    },

    async getTool(id: ToolId): Promise<AutomationTool | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tools')
        .select(TOOL_SELECT)
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '도구 조회');
      return data ? toTool(data) : null;
    },

    async getToolByName(campusId: CampusId, name: string): Promise<AutomationTool | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tools')
        .select(TOOL_SELECT)
        .eq('campus_id', campusId)
        .is('deleted_at', null)
        .ilike('name', name.trim())
        .maybeSingle();
      throwOnError(error, '도구 조회');
      return data ? toTool(data) : null;
    },

    async insertTool(tool: AutomationTool): Promise<AutomationTool> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tools')
        .insert(fromTool(tool))
        .select(TOOL_SELECT)
        .single();
      throwOnError(error, '도구 등록');
      await syncToolDevelopers(tool);
      return toTool(data);
    },

    async updateTool(tool: AutomationTool): Promise<AutomationTool> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tools')
        .update(fromTool(tool))
        .eq('id', tool.id)
        .select(TOOL_SELECT)
        .single();
      throwOnError(error, '도구 수정');
      await syncToolDevelopers(tool);
      return toTool(data);
    },

    async getVersion(id: ToolVersionId): Promise<AutomationToolVersion | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tool_versions')
        .select(VERSION_SELECT)
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '도구 버전 조회');
      return data ? toToolVersion(data) : null;
    },

    async listVersions(toolId: ToolId): Promise<AutomationToolVersion[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_tool_versions')
        .select(VERSION_SELECT)
        .eq('tool_id', toolId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      throwOnError(error, '도구 버전 목록 조회');
      return (data ?? []).map(toToolVersion);
    },

    async insertVersion(version: AutomationToolVersion): Promise<AutomationToolVersion> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('automation_tool_versions').insert(fromToolVersion(version));
      throwOnError(error, '도구 버전 등록');
      await syncVersionDetails(version);
      return version;
    },

    async updateVersion(version: AutomationToolVersion): Promise<AutomationToolVersion> {
      const supabase = await getUserClient();
      const { error } = await supabase
        .from('automation_tool_versions')
        .update(fromToolVersion(version))
        .eq('id', version.id);
      throwOnError(error, '도구 버전 수정');
      await syncVersionDetails(version);
      return version;
    },

    async listStatusHistory(toolId: ToolId): Promise<ToolStatusHistoryEntry[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_status_history')
        .select('*')
        .eq('tool_id', toolId)
        .order('changed_at', { ascending: false });
      throwOnError(error, '상태 이력 조회');
      return (data ?? []).map(toStatusHistory);
    },

    async insertStatusHistory(entry: ToolStatusHistoryEntry): Promise<ToolStatusHistoryEntry> {
      const supabase = await getUserClient();
      const tool = await supabase
        .from('automation_tools')
        .select('campus_id')
        .eq('id', entry.toolId)
        .single();
      throwOnError(tool.error, '상태 이력 기록');

      const { error } = await supabase.from('tool_status_history').insert({
        id: entry.id,
        tool_id: entry.toolId,
        campus_id: tool.data?.campus_id,
        from_status: entry.fromStatus,
        to_status: entry.toStatus,
        changed_by: entry.changedBy,
        changed_at: entry.changedAt,
        reason: entry.reason,
        review_comment: entry.reviewComment,
      });
      throwOnError(error, '상태 이력 기록');
      return entry;
    },

    async listAttachments(toolVersionId: ToolVersionId): Promise<ToolAttachment[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_attachments')
        .select('*')
        .eq('tool_version_id', toolVersionId)
        .order('created_at', { ascending: true });
      throwOnError(error, '첨부자료 조회');
      return (data ?? []).map(toAttachment);
    },

    async insertAttachment(attachment: ToolAttachment): Promise<ToolAttachment> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_attachments')
        .insert({
          id: attachment.id,
          tool_version_id: attachment.toolVersionId,
          kind: attachment.kind,
          file_name: attachment.fileName,
          mime_type: attachment.mimeType,
          byte_size: attachment.byteSize,
          storage_path: attachment.storagePath,
          created_by: attachment.createdBy,
        })
        .select('*')
        .single();
      throwOnError(error, '첨부자료 등록');
      return toAttachment(data);
    },

    async deleteAttachment(id: string): Promise<void> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('tool_attachments').delete().eq('id', id);
      throwOnError(error, '첨부자료 삭제');
    },
  };
}

/** 개발자 목록은 조인 테이블이므로 전체 교체 방식으로 동기화한다. */
async function syncToolDevelopers(tool: AutomationTool): Promise<void> {
  const supabase = await getUserClient();
  const { error: deleteError } = await supabase
    .from('tool_developers')
    .delete()
    .eq('tool_id', tool.id);
  throwOnError(deleteError, '개발자 목록 정리');

  if (tool.developerUserIds.length === 0) return;
  const { error } = await supabase
    .from('tool_developers')
    .insert(tool.developerUserIds.map((userId) => ({ tool_id: tool.id, user_id: userId })));
  throwOnError(error, '개발자 목록 저장');
}

/** 연동·데이터분류·비용·성과는 버전 하위 테이블이라 함께 갱신한다. */
async function syncVersionDetails(version: AutomationToolVersion): Promise<void> {
  const supabase = await getUserClient();

  const { error: integrationDeleteError } = await supabase
    .from('tool_integrations')
    .delete()
    .eq('tool_version_id', version.id);
  throwOnError(integrationDeleteError, '연동 정보 정리');

  if (version.integrations.length > 0) {
    const { error } = await supabase.from('tool_integrations').insert(
      version.integrations.map((integration) => ({
        tool_version_id: version.id,
        integration_system_id: integration.integrationSystemId,
        note: integration.note,
      })),
    );
    throwOnError(error, '연동 정보 저장');
  }

  const { error: classificationError } = await supabase.from('tool_data_classifications').upsert(
    version.security.classifications.map((entry) => ({
      tool_version_id: version.id,
      classification: entry.classification,
      in_use: entry.inUse,
      note: entry.note,
    })),
    { onConflict: 'tool_version_id,classification' },
  );
  throwOnError(classificationError, '데이터 분류 저장');

  const { error: costError } = await supabase
    .from('tool_costs')
    .upsert(fromToolCosts(version), { onConflict: 'tool_version_id' });
  throwOnError(costError, '비용 정보 저장');

  const { error: metricError } = await supabase
    .from('tool_metrics')
    .upsert(fromToolMetrics(version), { onConflict: 'tool_version_id' });
  throwOnError(metricError, '성과 정보 저장');
}
