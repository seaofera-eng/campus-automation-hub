import 'server-only';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import type { CampusId, ToolId, ToolVersionId, UserId } from '@/domain/shared/ids';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import type { ReviewRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

export function createDemoReviewRepository(): ReviewRepository {
  return {
    async listAssignments(campusId: CampusId, reviewerUserId?: UserId): Promise<ReviewAssignment[]> {
      const db = await loadDb();
      return clone(
        db.reviewAssignments
          .filter(
            (assignment) =>
              assignment.campusId === campusId &&
              (reviewerUserId === undefined || assignment.reviewerUserId === reviewerUserId),
          )
          .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)),
      );
    },

    async getAssignmentForVersion(toolVersionId: ToolVersionId): Promise<ReviewAssignment | null> {
      const db = await loadDb();
      const matches = db.reviewAssignments
        .filter((assignment) => assignment.toolVersionId === toolVersionId)
        .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
      return clone(matches[0] ?? null);
    },

    async upsertAssignment(assignment: ReviewAssignment): Promise<ReviewAssignment> {
      return mutateDb((db) => {
        const index = db.reviewAssignments.findIndex((row) => row.id === assignment.id);
        if (index >= 0) db.reviewAssignments[index] = clone(assignment);
        else db.reviewAssignments.push(clone(assignment));
        return clone(assignment);
      });
    },

    async listComments(toolId: ToolId): Promise<ReviewComment[]> {
      const db = await loadDb();
      return clone(
        db.reviewComments
          .filter((comment) => comment.toolId === toolId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },

    async insertComment(comment: ReviewComment): Promise<ReviewComment> {
      return mutateDb((db) => {
        db.reviewComments.push(clone(comment));
        return clone(comment);
      });
    },

    async getChecklist(toolVersionId: ToolVersionId): Promise<RiskChecklist | null> {
      const db = await loadDb();
      return clone(
        db.riskChecklists.find((checklist) => checklist.toolVersionId === toolVersionId) ?? null,
      );
    },

    async upsertChecklist(checklist: RiskChecklist): Promise<RiskChecklist> {
      return mutateDb((db) => {
        const index = db.riskChecklists.findIndex(
          (row) => row.toolVersionId === checklist.toolVersionId,
        );
        if (index >= 0) db.riskChecklists[index] = clone(checklist);
        else db.riskChecklists.push(clone(checklist));
        return clone(checklist);
      });
    },
  };
}
