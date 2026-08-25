import 'server-only';
import type { EvaluationHistoryEntry, ToolEvaluation } from '@/domain/evaluation/types';
import type {
  ImprovementRequest,
  ImprovementRequestHistoryEntry,
  ImprovementStatus,
} from '@/domain/improvement/types';
import { IMPROVEMENT_STATUSES } from '@/domain/improvement/types';
import type {
  CampusId,
  EvaluationId,
  ImprovementRequestId,
  ToolId,
  ToolVersionId,
  UserId,
} from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import type { EvaluationRepository, ImprovementQueryFilters, ImprovementRepository } from '../types';
import { getUserClient, throwOnError } from './client';
import {
  fromEvaluation,
  fromImprovement,
  toEvaluation,
  toEvaluationHistory,
  toImprovement,
  toImprovementHistory,
} from './mappers';

/** Postgres 유니크 제약 위반 코드. */
const UNIQUE_VIOLATION = '23505';

export function createSupabaseEvaluationRepository(): EvaluationRepository {
  return {
    async listByTool(toolId: ToolId): Promise<ToolEvaluation[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_evaluations')
        .select('*')
        .eq('tool_id', toolId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      throwOnError(error, '평가 목록 조회');
      return (data ?? []).map(toEvaluation);
    },

    async listByUser(userId: UserId): Promise<ToolEvaluation[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_evaluations')
        .select('*')
        .eq('evaluator_user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      throwOnError(error, '내 평가 조회');
      return (data ?? []).map(toEvaluation);
    },

    async countAll(campusId: CampusId): Promise<number> {
      const supabase = await getUserClient();
      const { count, error } = await supabase
        .from('tool_evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('campus_id', campusId)
        .is('deleted_at', null);
      throwOnError(error, '평가 수 집계');
      return count ?? 0;
    },

    async getById(id: EvaluationId): Promise<ToolEvaluation | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_evaluations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '평가 조회');
      return data ? toEvaluation(data) : null;
    },

    async findByUserAndVersion(
      userId: UserId,
      toolVersionId: ToolVersionId,
    ): Promise<ToolEvaluation | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_evaluations')
        .select('*')
        .eq('evaluator_user_id', userId)
        .eq('tool_version_id', toolVersionId)
        .is('deleted_at', null)
        .maybeSingle();
      throwOnError(error, '중복 평가 확인');
      return data ? toEvaluation(data) : null;
    },

    async insert(evaluation: ToolEvaluation): Promise<ToolEvaluation> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_evaluations')
        .insert(fromEvaluation(evaluation))
        .select('*')
        .single();

      // 요구사항 9번의 "같은 사용자·같은 버전 중복 평가 금지"는 uq_evaluation_user_version
      // 부분 유니크 인덱스가 최종 방어선이다. DEMO 구현과 같은 오류로 정규화해
      // 상위 계층이 구현체를 구분하지 않게 한다.
      if (error?.code === UNIQUE_VIOLATION) {
        throw new Error('DUPLICATE_EVALUATION');
      }
      throwOnError(error, '평가 등록');
      return toEvaluation(data);
    },

    async update(evaluation: ToolEvaluation): Promise<ToolEvaluation> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_evaluations')
        .update(fromEvaluation(evaluation))
        .eq('id', evaluation.id)
        .select('*')
        .single();
      throwOnError(error, '평가 수정');
      return toEvaluation(data);
    },

    async listHistory(evaluationId: EvaluationId): Promise<EvaluationHistoryEntry[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('evaluation_history')
        .select('*')
        .eq('evaluation_id', evaluationId)
        .order('changed_at', { ascending: false });
      throwOnError(error, '평가 변경 이력 조회');
      return (data ?? []).map(toEvaluationHistory);
    },

    async insertHistory(entry: EvaluationHistoryEntry): Promise<EvaluationHistoryEntry> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('evaluation_history')
        .insert({
          id: entry.id,
          evaluation_id: entry.evaluationId,
          previous_scores: entry.previousScores,
          previous_comment: entry.previousComment,
          changed_by: entry.changedBy,
          changed_at: entry.changedAt,
        })
        .select('*')
        .single();
      throwOnError(error, '평가 변경 이력 기록');
      return toEvaluationHistory(data);
    },
  };
}

export function createSupabaseImprovementRepository(): ImprovementRepository {
  return {
    async list(
      filters: ImprovementQueryFilters,
      page: PageRequest,
    ): Promise<Page<ImprovementRequest>> {
      const supabase = await getUserClient();
      const from = (page.page - 1) * page.pageSize;
      const to = from + page.pageSize - 1;

      let query = supabase
        .from('improvement_requests')
        .select('*', { count: 'exact' })
        .eq('campus_id', filters.campusId)
        .is('deleted_at', null);

      if (filters.statuses?.length) query = query.in('status', [...filters.statuses]);
      if (filters.toolId) query = query.eq('tool_id', filters.toolId);
      if (filters.assigneeUserId) {
        query = query.eq('assigned_developer_user_id', filters.assigneeUserId);
      }
      if (filters.requesterUserId) query = query.eq('requester_user_id', filters.requesterUserId);
      if (filters.keyword) {
        const escaped = filters.keyword.replace(/[%,()]/g, ' ').trim();
        if (escaped) query = query.or(`title.ilike.%${escaped}%,detail.ilike.%${escaped}%`);
      }

      // 상태 우선순위 정렬은 enum 정의 순서(OPEN → CLOSED)를 그대로 따른다.
      const { data, error, count } = await query
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to);
      throwOnError(error, '개선 요청 목록 조회');

      const totalItems = count ?? 0;
      return {
        items: (data ?? []).map(toImprovement),
        page: page.page,
        pageSize: page.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / page.pageSize)),
      };
    },

    async listByTool(toolId: ToolId): Promise<ImprovementRequest[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_requests')
        .select('*')
        .eq('tool_id', toolId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      throwOnError(error, '도구별 개선 요청 조회');
      return (data ?? []).map(toImprovement);
    },

    async countByStatus(campusId: CampusId): Promise<Record<ImprovementStatus, number>> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_requests')
        .select('status')
        .eq('campus_id', campusId)
        .is('deleted_at', null);
      throwOnError(error, '개선 요청 상태 집계');

      const counts = Object.fromEntries(
        IMPROVEMENT_STATUSES.map((status) => [status, 0]),
      ) as Record<ImprovementStatus, number>;
      for (const row of data ?? []) {
        const status = row.status as ImprovementStatus;
        if (status in counts) counts[status] += 1;
      }
      return counts;
    },

    async getById(id: ImprovementRequestId): Promise<ImprovementRequest | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '개선 요청 조회');
      return data ? toImprovement(data) : null;
    },

    async insert(request: ImprovementRequest): Promise<ImprovementRequest> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_requests')
        .insert(fromImprovement(request))
        .select('*')
        .single();
      throwOnError(error, '개선 요청 등록');
      return toImprovement(data);
    },

    async update(request: ImprovementRequest): Promise<ImprovementRequest> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_requests')
        .update(fromImprovement(request))
        .eq('id', request.id)
        .select('*')
        .single();
      throwOnError(error, '개선 요청 수정');
      return toImprovement(data);
    },

    async listHistory(id: ImprovementRequestId): Promise<ImprovementRequestHistoryEntry[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_request_history')
        .select('*')
        .eq('improvement_request_id', id)
        .order('changed_at', { ascending: false });
      throwOnError(error, '개선 요청 이력 조회');
      return (data ?? []).map(toImprovementHistory);
    },

    async insertHistory(
      entry: ImprovementRequestHistoryEntry,
    ): Promise<ImprovementRequestHistoryEntry> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('improvement_request_history')
        .insert({
          id: entry.id,
          improvement_request_id: entry.improvementRequestId,
          from_status: entry.fromStatus,
          to_status: entry.toStatus,
          changed_by: entry.changedBy,
          changed_at: entry.changedAt,
          comment: entry.comment,
        })
        .select('*')
        .single();
      throwOnError(error, '개선 요청 이력 기록');
      return toImprovementHistory(data);
    },
  };
}
