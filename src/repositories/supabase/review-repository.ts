import 'server-only';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import type { CampusId, ToolId, ToolVersionId, UserId } from '@/domain/shared/ids';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import type { ReviewRepository } from '../types';
import { getUserClient, throwOnError } from './client';
import {
  fromReviewAssignment,
  fromRiskChecklist,
  toReviewAssignment,
  toReviewComment,
  toRiskChecklist,
} from './mappers';

export function createSupabaseReviewRepository(): ReviewRepository {
  return {
    async listAssignments(campusId: CampusId, reviewerUserId?: UserId): Promise<ReviewAssignment[]> {
      const supabase = await getUserClient();
      let query = supabase
        .from('review_assignments')
        .select('*')
        .eq('campus_id', campusId)
        .order('assigned_at', { ascending: false });

      if (reviewerUserId) query = query.eq('reviewer_user_id', reviewerUserId);

      const { data, error } = await query;
      throwOnError(error, '검토 배정 목록 조회');
      return (data ?? []).map(toReviewAssignment);
    },

    async getAssignmentForVersion(toolVersionId: ToolVersionId): Promise<ReviewAssignment | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('review_assignments')
        .select('*')
        .eq('tool_version_id', toolVersionId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      throwOnError(error, '검토 배정 조회');
      return data ? toReviewAssignment(data) : null;
    },

    async upsertAssignment(assignment: ReviewAssignment): Promise<ReviewAssignment> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('review_assignments')
        .upsert(fromReviewAssignment(assignment))
        .select('*')
        .single();
      throwOnError(error, '검토 배정 저장');
      return toReviewAssignment(data);
    },

    async listComments(toolId: ToolId): Promise<ReviewComment[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('review_comments')
        .select('*')
        .eq('tool_id', toolId)
        .order('created_at', { ascending: true });
      throwOnError(error, '검토 의견 조회');
      return (data ?? []).map(toReviewComment);
    },

    async insertComment(comment: ReviewComment): Promise<ReviewComment> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('review_comments')
        .insert({
          id: comment.id,
          tool_id: comment.toolId,
          tool_version_id: comment.toolVersionId,
          author_user_id: comment.authorUserId,
          kind: comment.kind,
          body: comment.body,
        })
        .select('*')
        .single();
      throwOnError(error, '검토 의견 등록');
      return toReviewComment(data);
    },

    async getChecklist(toolVersionId: ToolVersionId): Promise<RiskChecklist | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('risk_checklists')
        .select('*')
        .eq('tool_version_id', toolVersionId)
        .maybeSingle();
      throwOnError(error, '위험 체크리스트 조회');
      return data ? toRiskChecklist(data) : null;
    },

    async upsertChecklist(checklist: RiskChecklist): Promise<RiskChecklist> {
      const supabase = await getUserClient();
      // 버전당 체크리스트는 한 건이므로 tool_version_id 를 충돌 기준으로 삼는다.
      const { data, error } = await supabase
        .from('risk_checklists')
        .upsert(fromRiskChecklist(checklist), { onConflict: 'tool_version_id' })
        .select('*')
        .single();
      throwOnError(error, '위험 체크리스트 저장');
      return toRiskChecklist(data);
    },
  };
}
