import 'server-only';
import type { EvaluationHistoryEntry, ToolEvaluation } from '@/domain/evaluation/types';
import type { CampusId, EvaluationId, ToolId, ToolVersionId, UserId } from '@/domain/shared/ids';
import type { EvaluationRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

export function createDemoEvaluationRepository(): EvaluationRepository {
  return {
    async listByTool(toolId: ToolId): Promise<ToolEvaluation[]> {
      const db = await loadDb();
      return clone(
        db.evaluations
          .filter((row) => row.toolId === toolId && row.deletedAt === null)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },

    async listByUser(userId: UserId): Promise<ToolEvaluation[]> {
      const db = await loadDb();
      return clone(
        db.evaluations.filter((row) => row.evaluatorUserId === userId && row.deletedAt === null),
      );
    },

    async countAll(campusId: CampusId): Promise<number> {
      const db = await loadDb();
      return db.evaluations.filter((row) => row.campusId === campusId && row.deletedAt === null)
        .length;
    },

    async getById(id: EvaluationId): Promise<ToolEvaluation | null> {
      const db = await loadDb();
      return clone(db.evaluations.find((row) => row.id === id) ?? null);
    },

    async findByUserAndVersion(
      userId: UserId,
      toolVersionId: ToolVersionId,
    ): Promise<ToolEvaluation | null> {
      const db = await loadDb();
      return clone(
        db.evaluations.find(
          (row) =>
            row.evaluatorUserId === userId &&
            row.toolVersionId === toolVersionId &&
            row.deletedAt === null,
        ) ?? null,
      );
    },

    async insert(evaluation: ToolEvaluation): Promise<ToolEvaluation> {
      return mutateDb((db) => {
        // 저장 직전에 한 번 더 확인한다. Supabase 구현에서는 유니크 제약이 같은 역할을 한다.
        const duplicate = db.evaluations.find(
          (row) =>
            row.evaluatorUserId === evaluation.evaluatorUserId &&
            row.toolVersionId === evaluation.toolVersionId &&
            row.deletedAt === null,
        );
        if (duplicate) {
          throw new Error('DUPLICATE_EVALUATION');
        }
        db.evaluations.push(clone(evaluation));
        return clone(evaluation);
      });
    },

    async update(evaluation: ToolEvaluation): Promise<ToolEvaluation> {
      return mutateDb((db) => {
        const index = db.evaluations.findIndex((row) => row.id === evaluation.id);
        if (index < 0) throw new Error(`평가를 찾을 수 없습니다: ${evaluation.id}`);
        db.evaluations[index] = clone(evaluation);
        return clone(evaluation);
      });
    },

    async listHistory(evaluationId: EvaluationId): Promise<EvaluationHistoryEntry[]> {
      const db = await loadDb();
      return clone(
        db.evaluationHistory
          .filter((entry) => entry.evaluationId === evaluationId)
          .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
      );
    },

    async insertHistory(entry: EvaluationHistoryEntry): Promise<EvaluationHistoryEntry> {
      return mutateDb((db) => {
        db.evaluationHistory.push(clone(entry));
        return clone(entry);
      });
    },
  };
}
