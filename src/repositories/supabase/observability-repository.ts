import 'server-only';
import { DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import type { DemandStatus } from '@/domain/demand/types';
import { IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import type { ImprovementStatus } from '@/domain/improvement/types';
import type {
  ActivityEntry,
  AuditLog,
  Notification,
  UsageEvent,
} from '@/domain/observability/types';
import type { CampusId, ToolId, UserId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import { TOOL_STATUS_LABELS } from '@/domain/tool/types';
import type { ToolStatus } from '@/domain/tool/types';
import type { AuditLogFilters, ObservabilityRepository } from '../types';
import { getServiceClient, getUserClient, throwOnError } from './client';
import { fromAuditLog, fromNotification, toAuditLog, toNotification } from './mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 최근 활동은 네 종류의 테이블에서 모은다.
 *
 * 1단계에서는 각 테이블을 개별 조회한 뒤 애플리케이션에서 병합·정렬한다.
 * 실제 Supabase 연결 후 데이터가 커지면 통합 뷰(`recent_activity`)를 만들어
 * 이 함수만 교체하면 된다. 상위 계층 계약은 그대로다.
 */
async function collectActivity(campusId: CampusId, limit: number): Promise<ActivityEntry[]> {
  const supabase = await getUserClient();
  const entries: ActivityEntry[] = [];

  const [statusRes, demandRes, evaluationRes, improvementRes] = await Promise.all([
    supabase
      .from('tool_status_history')
      .select('id, from_status, to_status, changed_at, tool_id, automation_tools(name), profiles:changed_by(name)')
      .eq('campus_id', campusId)
      .order('changed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('automation_demands')
      .select('id, title, status, updated_at, profiles:requester_user_id(name)')
      .eq('campus_id', campusId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('tool_evaluations')
      .select('id, overall, created_at, tool_id, automation_tools(name), profiles:evaluator_user_id(name)')
      .eq('campus_id', campusId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('improvement_requests')
      .select('id, title, status, updated_at, profiles:requester_user_id(name)')
      .eq('campus_id', campusId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit),
  ]);

  throwOnError(statusRes.error, '최근 활동 조회');
  throwOnError(demandRes.error, '최근 활동 조회');
  throwOnError(evaluationRes.error, '최근 활동 조회');
  throwOnError(improvementRes.error, '최근 활동 조회');

  /** 조인 결과는 단일 객체 또는 배열로 올 수 있다. */
  function joined(value: unknown): Record<string, any> | null {
    if (Array.isArray(value)) return (value[0] as Record<string, any>) ?? null;
    return (value as Record<string, any>) ?? null;
  }

  function actorName(value: unknown): string {
    const row = joined(value);
    return typeof row?.name === 'string' ? row.name : '알 수 없음';
  }

  for (const row of (statusRes.data ?? []) as Record<string, any>[]) {
    const toolName = joined(row.automation_tools)?.name ?? '도구';
    const from = row.from_status ? TOOL_STATUS_LABELS[row.from_status as ToolStatus] : '신규';
    const to = TOOL_STATUS_LABELS[row.to_status as ToolStatus];
    entries.push({
      id: `status-${row.id}`,
      occurredAt: String(row.changed_at),
      description: `'${toolName}' 상태가 ${from} → ${to}(으)로 변경되었습니다.`,
      actorName: actorName(row.profiles),
      linkPath: `/tools/${row.tool_id}`,
      kind: 'TOOL_STATUS',
    });
  }

  for (const row of (demandRes.data ?? []) as Record<string, any>[]) {
    entries.push({
      id: `demand-${row.id}`,
      occurredAt: String(row.updated_at),
      description: `수요 '${row.title}'이(가) ${DEMAND_STATUS_LABELS[row.status as DemandStatus]} 상태입니다.`,
      actorName: actorName(row.profiles),
      linkPath: `/demands/${row.id}`,
      kind: 'DEMAND',
    });
  }

  for (const row of (evaluationRes.data ?? []) as Record<string, any>[]) {
    const toolName = joined(row.automation_tools)?.name ?? '도구';
    entries.push({
      id: `evaluation-${row.id}`,
      occurredAt: String(row.created_at),
      description: `'${toolName}'에 종합 ${row.overall}점 평가가 등록되었습니다.`,
      actorName: actorName(row.profiles),
      linkPath: `/tools/${row.tool_id}`,
      kind: 'EVALUATION',
    });
  }

  for (const row of (improvementRes.data ?? []) as Record<string, any>[]) {
    entries.push({
      id: `improvement-${row.id}`,
      occurredAt: String(row.updated_at),
      description: `개선 요청 '${row.title}'이(가) ${IMPROVEMENT_STATUS_LABELS[row.status as ImprovementStatus]} 상태입니다.`,
      actorName: actorName(row.profiles),
      linkPath: `/improvements/${row.id}`,
      kind: 'IMPROVEMENT',
    });
  }

  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}

export function createSupabaseObservabilityRepository(): ObservabilityRepository {
  return {
    async insertAuditLog(log: AuditLog): Promise<AuditLog> {
      // 감사 로그는 사용자 권한과 무관하게 반드시 남아야 하므로 service_role 로 기록한다.
      // (0011_rls_policies.sql 에서 audit_logs 에는 insert 정책을 두지 않았다.)
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(fromAuditLog(log))
        .select('*')
        .single();
      throwOnError(error, '감사 로그 기록');
      return toAuditLog(data);
    },

    async listAuditLogs(filters: AuditLogFilters, page: PageRequest): Promise<Page<AuditLog>> {
      const supabase = await getUserClient();
      const from = (page.page - 1) * page.pageSize;
      const to = from + page.pageSize - 1;

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('campus_id', filters.campusId);

      if (filters.action) query = query.ilike('action', `%${filters.action}%`);
      if (filters.actorUserId) query = query.eq('actor_user_id', filters.actorUserId);
      if (filters.targetType) query = query.eq('target_type', filters.targetType);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      throwOnError(error, '감사 로그 조회');

      const totalItems = count ?? 0;
      return {
        items: (data ?? []).map(toAuditLog),
        page: page.page,
        pageSize: page.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / page.pageSize)),
      };
    },

    async insertUsageEvent(event: UsageEvent): Promise<void> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('usage_events').insert({
        id: event.id,
        campus_id: event.campusId,
        tool_id: event.toolId,
        user_id: event.userId,
        event_type: event.eventType,
        occurred_at: event.occurredAt,
      });
      throwOnError(error, '사용 이벤트 기록');
    },

    async countUsageByTool(toolId: ToolId): Promise<{ views: number; launches: number }> {
      const supabase = await getUserClient();
      const [viewRes, launchRes] = await Promise.all([
        supabase
          .from('usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('tool_id', toolId)
          .eq('event_type', 'VIEW'),
        supabase
          .from('usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('tool_id', toolId)
          .eq('event_type', 'LAUNCH'),
      ]);
      throwOnError(viewRes.error, '사용 현황 집계');
      throwOnError(launchRes.error, '사용 현황 집계');
      return { views: viewRes.count ?? 0, launches: launchRes.count ?? 0 };
    },

    async listNotifications(userId: UserId, onlyUnread: boolean): Promise<Notification[]> {
      const supabase = await getUserClient();
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (onlyUnread) query = query.is('read_at', null);

      const { data, error } = await query;
      throwOnError(error, '알림 조회');
      return (data ?? []).map(toNotification);
    },

    async insertNotification(notification: Notification): Promise<Notification> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('notifications')
        .insert(fromNotification(notification))
        .select('*')
        .single();
      throwOnError(error, '알림 등록');
      return toNotification(data);
    },

    async markNotificationRead(id: string, at: string): Promise<void> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('notifications').update({ read_at: at }).eq('id', id);
      throwOnError(error, '알림 읽음 처리');
    },

    async markAllNotificationsRead(userId: UserId, at: string): Promise<void> {
      const supabase = await getUserClient();
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: at })
        .eq('recipient_user_id', userId)
        .is('read_at', null);
      throwOnError(error, '알림 전체 읽음 처리');
    },

    async listRecentActivity(campusId: CampusId, limit: number): Promise<ActivityEntry[]> {
      return collectActivity(campusId, limit);
    },
  };
}
