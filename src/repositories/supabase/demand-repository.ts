import 'server-only';
import type {
  AutomationDemand,
  DemandMatch,
  DemandParticipant,
  DemandStatus,
} from '@/domain/demand/types';
import { DEMAND_STATUSES } from '@/domain/demand/types';
import type { CampusId, DemandId, ToolId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import type { DemandQueryFilters, DemandRepository } from '../types';
import { getUserClient, throwOnError } from './client';
import {
  fromDemand,
  fromDemandMatch,
  toDemand,
  toDemandMatch,
  toDemandParticipant,
} from './mappers';

export function createSupabaseDemandRepository(): DemandRepository {
  return {
    async listDemands(
      filters: DemandQueryFilters,
      page: PageRequest,
    ): Promise<Page<AutomationDemand>> {
      const supabase = await getUserClient();
      const from = (page.page - 1) * page.pageSize;
      const to = from + page.pageSize - 1;

      let query = supabase
        .from('automation_demands')
        .select('*', { count: 'exact' })
        .eq('campus_id', filters.campusId)
        .is('deleted_at', null);

      if (filters.statuses?.length) query = query.in('status', [...filters.statuses]);
      if (filters.departmentIds?.length) {
        query = query.in('department_id', [...filters.departmentIds]);
      }
      if (filters.requesterUserId) {
        query = query.eq('requester_user_id', filters.requesterUserId);
      }
      if (filters.keyword) {
        // PostgREST 의 or() 필터에서 특수문자는 구문으로 해석되므로 미리 제거한다.
        const escaped = filters.keyword.replace(/[%,()]/g, ' ').trim();
        if (escaped) {
          query = query.or(
            `title.ilike.%${escaped}%,current_work_description.ilike.%${escaped}%,desired_outcome.ilike.%${escaped}%`,
          );
        }
      }

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(from, to);
      throwOnError(error, '수요 목록 조회');

      const totalItems = count ?? 0;
      return {
        items: (data ?? []).map(toDemand),
        page: page.page,
        pageSize: page.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / page.pageSize)),
      };
    },

    async countByStatus(campusId: CampusId): Promise<Record<DemandStatus, number>> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_demands')
        .select('status')
        .eq('campus_id', campusId)
        .is('deleted_at', null);
      throwOnError(error, '수요 상태 집계');

      const counts = Object.fromEntries(DEMAND_STATUSES.map((status) => [status, 0])) as Record<
        DemandStatus,
        number
      >;
      for (const row of data ?? []) {
        const status = row.status as DemandStatus;
        if (status in counts) counts[status] += 1;
      }
      return counts;
    },

    async getDemand(id: DemandId): Promise<AutomationDemand | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_demands')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '수요 조회');
      return data ? toDemand(data) : null;
    },

    async insertDemand(demand: AutomationDemand): Promise<AutomationDemand> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_demands')
        .insert(fromDemand(demand))
        .select('*')
        .single();
      throwOnError(error, '수요 등록');
      return toDemand(data);
    },

    async updateDemand(demand: AutomationDemand): Promise<AutomationDemand> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('automation_demands')
        .update(fromDemand(demand))
        .eq('id', demand.id)
        .select('*')
        .single();
      throwOnError(error, '수요 수정');
      return toDemand(data);
    },

    async listMatches(demandId: DemandId): Promise<DemandMatch[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('demand_matches')
        .select('*')
        .eq('demand_id', demandId)
        .order('matched_at', { ascending: false });
      throwOnError(error, '수요 매칭 조회');
      return (data ?? []).map(toDemandMatch);
    },

    async listMatchesForTool(toolId: ToolId): Promise<DemandMatch[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('demand_matches')
        .select('*')
        .eq('tool_id', toolId)
        .order('matched_at', { ascending: false });
      throwOnError(error, '도구 연결 수요 조회');
      return (data ?? []).map(toDemandMatch);
    },

    async insertMatch(match: DemandMatch): Promise<DemandMatch> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('demand_matches')
        .insert(fromDemandMatch(match))
        .select('*')
        .single();
      throwOnError(error, '수요-도구 연결');
      return toDemandMatch(data);
    },

    async deleteMatch(id: string): Promise<void> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('demand_matches').delete().eq('id', id);
      throwOnError(error, '수요-도구 연결 해제');
    },

    async listParticipants(demandId: DemandId): Promise<DemandParticipant[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('demand_participants')
        .select('*')
        .eq('demand_id', demandId)
        .order('joined_at', { ascending: true });
      throwOnError(error, '개발 참여자 조회');
      return (data ?? []).map(toDemandParticipant);
    },

    async insertParticipant(participant: DemandParticipant): Promise<DemandParticipant> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('demand_participants')
        .insert({
          id: participant.id,
          demand_id: participant.demandId,
          user_id: participant.userId,
          participant_role: participant.participantRole,
          message: participant.message,
          joined_at: participant.joinedAt,
        })
        .select('*')
        .single();
      throwOnError(error, '개발 참여 신청');
      return toDemandParticipant(data);
    },
  };
}
