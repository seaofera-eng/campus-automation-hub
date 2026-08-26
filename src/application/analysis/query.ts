import 'server-only';
import type {
  DemandAnalysis,
  DuplicateFinding,
  DuplicateRecommendation,
  DuplicateVerdict,
  QualityReviewResult,
  QualityVerdict,
  RiskAnalysis,
  RiskFactorSuggestion,
} from '@/domain/analysis/types';
import { findRiskDisagreements } from '@/domain/analysis/types';
import type { CampusId, DemandId, ToolVersionId } from '@/domain/shared/ids';
import type { RiskChecklist, RiskFactorCode } from '@/domain/tool/risk-checklist-rules';
import type { RiskLevel } from '@/domain/tool/types';
import { getRepositories } from '@/lib/di/container';

/**
 * 저장된 AI 분석을 화면에서 쓸 모양으로 읽어 온다.
 *
 * **모델을 부르지 않는다.** 분석은 `pnpm ai:analyze` 가 미리 돌려 저장해 둔 것을
 * 읽기만 한다. 페이지를 여는 것과 분석을 돌리는 것은 다른 일이다.
 *
 * 분석이 없으면 `null` 을 돌려준다. 화면은 그걸 "아직 분석하지 않았습니다"로
 * 표시한다. 없는 것을 0 으로 채우지 않는다.
 */

/** 이 분석을 어디까지 믿어도 되는지 한 줄로. 화면에 늘 붙인다. */
export interface AnalysisProvenanceView {
  model: string;
  generatedAt: string;
  humanReviewed: boolean;
  reviewerName: string | null;
  reviewedAt: string | null;
}

export interface DuplicateFindingView extends Omit<DuplicateFinding, 'candidateToolId'> {
  candidateToolId: string;
  candidateToolName: string;
  /** 이미 지워졌거나 볼 수 없는 도구인지 */
  candidateAvailable: boolean;
}

export interface DuplicateAnalysisView {
  findings: DuplicateFindingView[];
  comparedCount: number;
  provenance: AnalysisProvenanceView;
  /** 가장 무거운 판정. 배지 하나로 요약할 때 쓴다. */
  topVerdict: DuplicateVerdict | null;
  /** 가장 무거운 건의 처리 제안 */
  topRecommendation: DuplicateRecommendation | null;
}

export interface RiskSuggestionView extends RiskFactorSuggestion {
  label: string;
  /** 검토자가 내린 판단과 갈렸는가. 체크리스트가 없으면 false. */
  disagrees: boolean;
}

export interface RiskAnalysisView {
  suggestedLevel: RiskLevel;
  summary: string;
  suggestions: RiskSuggestionView[];
  requiredControls: { code: RiskFactorCode; description: string; mandatory: boolean }[];
  provenance: AnalysisProvenanceView;
  /** 모델 제안과 검토자 판단이 갈린 항목 수. 감추지 않고 보여 준다. */
  disagreementCount: number;
  /** 검토자가 확정한 등급. 아직 없으면 null. */
  confirmedLevel: RiskLevel | null;
}

export interface QualityReviewView {
  results: QualityReviewResult[];
  disagreement: boolean;
  verdict: QualityVerdict;
  provenance: AnalysisProvenanceView;
  /** 확인이 필요한 지적 수. 배지 하나로 요약할 때 쓴다. */
  blockerCount: number;
  totalFindings: number;
}

export interface DemandMatchFindingView {
  toolId: string;
  toolName: string;
  score: number;
  coveredFeatures: string[];
  missingFeatures: string[];
  explanation: string;
}

export interface DemandAnalysisView {
  outcome: DemandAnalysis['outcome'];
  findings: DemandMatchFindingView[];
  comparedCount: number;
  provenance: AnalysisProvenanceView;
}

/* -------------------------------------------------------------------------- */

async function toProvenanceView(
  provenance: { model: string; generatedAt: string; humanReviewed: boolean; reviewedBy: string | null; reviewedAt: string | null },
  campusId: CampusId,
): Promise<AnalysisProvenanceView> {
  let reviewerName: string | null = null;
  if (provenance.reviewedBy) {
    const profiles = await getRepositories().identity.listProfiles(campusId);
    reviewerName = profiles.find((profile) => profile.id === provenance.reviewedBy)?.name ?? null;
  }
  return {
    model: provenance.model,
    generatedAt: provenance.generatedAt,
    humanReviewed: provenance.humanReviewed,
    reviewerName,
    reviewedAt: provenance.reviewedAt,
  };
}

/** 판정을 무거운 순으로 정렬할 때 쓰는 순서. */
const VERDICT_WEIGHT: Record<DuplicateVerdict, number> = {
  NEAR_IDENTICAL: 3,
  HIGH_OVERLAP: 2,
  RELATED: 1,
  INDEPENDENT: 0,
};

export async function loadDuplicateAnalysis(
  toolVersionId: ToolVersionId,
  campusId: CampusId,
): Promise<DuplicateAnalysisView | null> {
  const repositories = getRepositories();
  const analysis = await repositories.analyses.getDuplicateAnalysis(toolVersionId);
  if (!analysis) return null;

  const findings: DuplicateFindingView[] = await Promise.all(
    analysis.findings.map(async (finding) => {
      const candidate = await repositories.tools.getTool(finding.candidateToolId);
      // 분석을 돌린 뒤 도구가 지워졌을 수 있다. 이름 대신 안내를 낸다.
      const available = candidate !== null && candidate.deletedAt === null;
      return {
        ...finding,
        candidateToolId: finding.candidateToolId as string,
        candidateToolName: available && candidate ? candidate.name : '삭제된 도구',
        candidateAvailable: available,
      };
    }),
  );

  const heaviest = [...findings].sort(
    (left, right) => VERDICT_WEIGHT[right.verdict] - VERDICT_WEIGHT[left.verdict],
  )[0];

  return {
    findings,
    comparedCount: analysis.comparedCount,
    provenance: await toProvenanceView(analysis.provenance, campusId),
    topVerdict: heaviest?.verdict ?? null,
    topRecommendation: heaviest?.recommendation ?? null,
  };
}

export async function loadRiskAnalysis(
  toolVersionId: ToolVersionId,
  campusId: CampusId,
  checklist: RiskChecklist | null,
  factorLabels: ReadonlyMap<RiskFactorCode, string>,
): Promise<RiskAnalysisView | null> {
  const analysis = await getRepositories().analyses.getRiskAnalysis(toolVersionId);
  if (!analysis) return null;

  const disagreements = checklist
    ? findRiskDisagreements(analysis, checklist.items)
    : [];
  const disagreed = new Set(disagreements.map((entry) => entry.code));

  return {
    suggestedLevel: analysis.suggestedLevel,
    summary: analysis.summary,
    suggestions: analysis.suggestions.map((suggestion) => ({
      ...suggestion,
      label: factorLabels.get(suggestion.code) ?? suggestion.code,
      disagrees: disagreed.has(suggestion.code),
    })),
    requiredControls: analysis.requiredControls,
    provenance: await toProvenanceView(analysis.provenance, campusId),
    disagreementCount: disagreements.length,
    confirmedLevel: checklist?.riskLevel ?? null,
  };
}

export async function loadQualityReview(
  toolVersionId: ToolVersionId,
  campusId: CampusId,
): Promise<QualityReviewView | null> {
  const review = await getRepositories().analyses.getQualityReview(toolVersionId);
  if (!review) return null;

  const findings = review.results.flatMap((result) => result.findings);

  return {
    results: review.results,
    disagreement: review.disagreement,
    verdict: review.verdict,
    provenance: await toProvenanceView(review.provenance, campusId),
    blockerCount: findings.filter((finding) => finding.severity === 'BLOCKER').length,
    totalFindings: findings.length,
  };
}

export async function loadDemandAnalysis(
  demandId: DemandId,
  campusId: CampusId,
): Promise<DemandAnalysisView | null> {
  const repositories = getRepositories();
  const analysis = await repositories.analyses.getDemandAnalysis(demandId);
  if (!analysis) return null;

  const findings: DemandMatchFindingView[] = await Promise.all(
    analysis.findings.map(async (finding) => {
      const tool = await repositories.tools.getTool(finding.toolId);
      return {
        toolId: finding.toolId as string,
        toolName: tool && tool.deletedAt === null ? tool.name : '삭제된 도구',
        score: finding.score,
        coveredFeatures: finding.coveredFeatures,
        missingFeatures: finding.missingFeatures,
        explanation: finding.explanation,
      };
    }),
  );

  return {
    outcome: analysis.outcome,
    findings,
    comparedCount: analysis.comparedCount,
    provenance: await toProvenanceView(analysis.provenance, campusId),
  };
}

/** 사람이 확인했다고 표시한다. 검토자가 분석을 읽었다는 기록이다. */
export async function markDuplicateAnalysisReviewed(
  toolVersionId: ToolVersionId,
  reviewerId: string,
): Promise<void> {
  const repositories = getRepositories();
  const analysis = await repositories.analyses.getDuplicateAnalysis(toolVersionId);
  if (!analysis) return;

  await repositories.analyses.upsertDuplicateAnalysis({
    ...analysis,
    provenance: {
      ...analysis.provenance,
      humanReviewed: true,
      reviewedBy: reviewerId as RiskAnalysis['provenance']['reviewedBy'],
      reviewedAt: new Date().toISOString(),
    },
  });
}
