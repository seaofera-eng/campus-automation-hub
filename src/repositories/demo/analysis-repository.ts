import 'server-only';
import type {
  DemandAnalysis,
  DuplicateAnalysis,
  QualityReview,
  RiskAnalysis,
} from '@/domain/analysis/types';
import type { CampusId, DemandId, ToolVersionId } from '@/domain/shared/ids';
import type { AnalysisRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

/**
 * AI 분석 결과 (DEMO).
 *
 * 도구 버전 하나에 분석 하나라 upsert 로 덮어쓴다. 같은 버전을 두 번 분석하면
 * 나중 것이 남는다 — 같은 입력이니 이전 것을 쌓아 둘 이유가 없다.
 */
export function createDemoAnalysisRepository(): AnalysisRepository {
  return {
    async getDuplicateAnalysis(toolVersionId: ToolVersionId): Promise<DuplicateAnalysis | null> {
      const db = await loadDb();
      const found = db.duplicateAnalyses.find((row) => row.toolVersionId === toolVersionId);
      return found ? clone(found) : null;
    },

    async listDuplicateAnalyses(campusId: CampusId): Promise<DuplicateAnalysis[]> {
      const db = await loadDb();
      // 분석 자체에는 캠퍼스가 없다. 도구를 거쳐 걸러 낸다.
      const toolIds = new Set(
        db.tools.filter((tool) => tool.campusId === campusId).map((tool) => tool.id),
      );
      return clone(db.duplicateAnalyses.filter((row) => toolIds.has(row.toolId)));
    },

    async upsertDuplicateAnalysis(analysis: DuplicateAnalysis): Promise<DuplicateAnalysis> {
      return mutateDb((db) => {
        const index = db.duplicateAnalyses.findIndex(
          (row) => row.toolVersionId === analysis.toolVersionId,
        );
        if (index >= 0) db.duplicateAnalyses[index] = clone(analysis);
        else db.duplicateAnalyses.push(clone(analysis));
        return clone(analysis);
      });
    },

    async getRiskAnalysis(toolVersionId: ToolVersionId): Promise<RiskAnalysis | null> {
      const db = await loadDb();
      const found = db.riskAnalyses.find((row) => row.toolVersionId === toolVersionId);
      return found ? clone(found) : null;
    },

    async upsertRiskAnalysis(analysis: RiskAnalysis): Promise<RiskAnalysis> {
      return mutateDb((db) => {
        const index = db.riskAnalyses.findIndex(
          (row) => row.toolVersionId === analysis.toolVersionId,
        );
        if (index >= 0) db.riskAnalyses[index] = clone(analysis);
        else db.riskAnalyses.push(clone(analysis));
        return clone(analysis);
      });
    },

    async getDemandAnalysis(demandId: DemandId): Promise<DemandAnalysis | null> {
      const db = await loadDb();
      const found = db.demandAnalyses.find((row) => row.demandId === demandId);
      return found ? clone(found) : null;
    },

    async upsertDemandAnalysis(analysis: DemandAnalysis): Promise<DemandAnalysis> {
      return mutateDb((db) => {
        const index = db.demandAnalyses.findIndex((row) => row.demandId === analysis.demandId);
        if (index >= 0) db.demandAnalyses[index] = clone(analysis);
        else db.demandAnalyses.push(clone(analysis));
        return clone(analysis);
      });
    },

    async getQualityReview(toolVersionId: ToolVersionId): Promise<QualityReview | null> {
      const db = await loadDb();
      const found = db.qualityReviews.find((row) => row.toolVersionId === toolVersionId);
      return found ? clone(found) : null;
    },

    async upsertQualityReview(review: QualityReview): Promise<QualityReview> {
      return mutateDb((db) => {
        const index = db.qualityReviews.findIndex(
          (row) => row.toolVersionId === review.toolVersionId,
        );
        if (index >= 0) db.qualityReviews[index] = clone(review);
        else db.qualityReviews.push(clone(review));
        return clone(review);
      });
    },
  };
}
