import type { DemandId, ToolId, ToolVersionId, UserId } from '@/domain/shared/ids';
import type { DataClassification, AutomationLevel, RiskLevel } from '@/domain/tool/types';

/**
 * 2·3단계 AI 기능을 위한 서비스 인터페이스 (요구사항 13번).
 *
 * ⚠️ 1단계에서는 실제 LLM/임베딩 호출을 **하지 않는다**.
 *    모든 구현체는 Noop이며 `{ enabled: false }` 만 돌려준다.
 *    화면은 이 상태를 그대로 표시하고, 점수·유사도 같은 숫자를 만들어내지 않는다.
 *    (요구사항 2번: "가짜 AI 분석 결과를 실제 결과처럼 표시하지 않는다.")
 */

export type AiPhase = 'PHASE_2' | 'PHASE_3';

/** 아직 활성화되지 않은 기능의 상태. 화면에 그대로 표시한다. */
export interface AiFeatureDisabled {
  enabled: false;
  /** 어느 단계에서 제공될 예정인지 */
  phase: AiPhase;
  /** 화면에 표시할 안내 문구 */
  message: string;
}

/** 기능이 켜졌을 때의 결과 봉투. 2단계에서 사용한다. */
export interface AiFeatureEnabled<T> {
  enabled: true;
  data: T;
  /** 어떤 모델로 언제 만든 결과인지 — 항상 함께 표시한다 */
  provenance: {
    model: string;
    generatedAt: string;
    /** 사람이 확인했는가 */
    humanReviewed: boolean;
  };
}

export type AiResult<T> = AiFeatureEnabled<T> | AiFeatureDisabled;

/* -------------------------------------------------------------------------- */
/* 중복 탐지 (요구사항 14번)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 중복 판정 기준. 관리자가 조정할 수 있도록 값으로 분리해 둔다.
 * 요구사항 14번의 예시 구간을 기본값으로 쓴다.
 */
export interface DuplicateThresholds {
  /** 이 값 이상이면 '사실상 동일한 후보' */
  nearIdentical: number;
  /** 이 값 이상이면 '높은 중복 가능성' */
  highOverlap: number;
  /** 이 값 이상이면 '관련 도구' */
  related: number;
}

export const DEFAULT_DUPLICATE_THRESHOLDS: DuplicateThresholds = {
  nearIdentical: 85,
  highOverlap: 70,
  related: 50,
};

export type DuplicateVerdict = 'NEAR_IDENTICAL' | 'HIGH_OVERLAP' | 'RELATED' | 'INDEPENDENT';

export const DUPLICATE_VERDICT_LABELS: Record<DuplicateVerdict, string> = {
  NEAR_IDENTICAL: '사실상 동일한 후보',
  HIGH_OVERLAP: '높은 중복 가능성',
  RELATED: '관련 도구',
  INDEPENDENT: '독립적인 도구',
};

/**
 * 비교 대상 필드 (요구사항 14번).
 * 2단계 구현이 이 목록을 그대로 입력 스펙으로 사용한다.
 */
export const DUPLICATE_COMPARISON_FIELDS = [
  'name',
  'problemStatement',
  'keyFeatures',
  'inputData',
  'outputData',
  'expectedUsers',
  'department',
  'integrations',
  'automationLevel',
  'dataClassifications',
  'workflow',
] as const;

export type DuplicateComparisonField = (typeof DUPLICATE_COMPARISON_FIELDS)[number];

export interface DuplicateCandidate {
  candidateToolId: ToolId;
  /** 0~100 */
  score: number;
  verdict: DuplicateVerdict;
  /** 어떤 필드가 얼마나 비슷한지 */
  fieldScores: Partial<Record<DuplicateComparisonField, number>>;
  /** 사람이 읽을 수 있는 비교 설명 */
  explanation: string;
}

export interface DuplicateDetectionResult {
  sourceToolVersionId: ToolVersionId;
  candidates: DuplicateCandidate[];
  thresholds: DuplicateThresholds;
}

export interface DuplicateDetectionService {
  analyzeNewTool(toolVersionId: ToolVersionId): Promise<AiResult<DuplicateDetectionResult>>;
  findCandidates(toolVersionId: ToolVersionId): Promise<AiResult<DuplicateCandidate[]>>;
  compareTools(sourceId: ToolId, candidateId: ToolId): Promise<AiResult<DuplicateCandidate>>;
  saveResult(result: DuplicateDetectionResult): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 위험 평가 (요구사항 15번)                                                    */
/* -------------------------------------------------------------------------- */

export interface RequiredControl {
  code: string;
  description: string;
  mandatory: boolean;
}

export interface RiskAssessmentResult {
  toolVersionId: ToolVersionId;
  /** AI가 제안한 등급. 최종 확정은 항상 사람이 한다. */
  suggestedLevel: RiskLevel;
  factors: { code: string; applies: boolean; reason: string }[];
  requiredControls: RequiredControl[];
  /** CRITICAL 이면 사람의 최종 검토 없이 승인할 수 없다 */
  requiresHumanApproval: boolean;
}

export interface RiskAssessmentService {
  assessTool(toolVersionId: ToolVersionId): Promise<AiResult<RiskAssessmentResult>>;
  evaluateDataRisk(
    dataClassifications: readonly DataClassification[],
  ): Promise<AiResult<RiskLevel>>;
  evaluateAutomationRisk(automationLevel: AutomationLevel): Promise<AiResult<RiskLevel>>;
  generateRequiredControls(): Promise<AiResult<RequiredControl[]>>;
  saveAssessment(result: RiskAssessmentResult): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 수요 매칭                                                                    */
/* -------------------------------------------------------------------------- */

export interface DemandMatchCandidate {
  toolId: ToolId;
  score: number;
  explanation: string;
}

export interface DemandMatchingService {
  findMatchingTools(demandId: DemandId): Promise<AiResult<DemandMatchCandidate[]>>;
  calculateMatchScore(demandId: DemandId, toolId: ToolId): Promise<AiResult<number>>;
  explainMatch(demandId: DemandId, toolId: ToolId): Promise<AiResult<string>>;
  saveCandidates(demandId: DemandId, candidates: DemandMatchCandidate[]): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 멀티 LLM 품질검증 (3단계)                                                    */
/* -------------------------------------------------------------------------- */

export type LlmReviewKind = 'FACTUALITY' | 'POLICY' | 'SECURITY';

export interface LlmReviewResult {
  kind: LlmReviewKind;
  model: string;
  passed: boolean;
  findings: string[];
  confidence: number;
}

export interface LlmReviewRun {
  id: string;
  toolVersionId: ToolVersionId;
  testCaseId: string | null;
  results: LlmReviewResult[];
  /** 모델 간 의견이 갈렸는가 — 갈리면 반드시 사람이 확인한다 */
  disagreement: boolean;
  aggregatedVerdict: 'PASS' | 'FAIL' | 'NEEDS_HUMAN_REVIEW';
}

export interface MultiLlmReviewService {
  createReviewRun(toolVersionId: ToolVersionId, testCaseId: string | null): Promise<AiResult<LlmReviewRun>>;
  runFactualityReview(runId: string): Promise<AiResult<LlmReviewResult>>;
  runPolicyReview(runId: string): Promise<AiResult<LlmReviewResult>>;
  runSecurityReview(runId: string): Promise<AiResult<LlmReviewResult>>;
  aggregateResults(runId: string): Promise<AiResult<LlmReviewRun>>;
  requestHumanApproval(runId: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 순위 (요구사항 16번)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * 순위 가중치. 단순 평균 평점으로 순위를 만들지 않는다.
 * 합계는 1.0 이어야 한다.
 */
export interface RankingWeights {
  evaluationQuality: number;
  adoption: number;
  timeSaved: number;
  stability: number;
  safety: number;
  maintenance: number;
  crossDepartmentSpread: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  evaluationQuality: 0.3,
  adoption: 0.2,
  timeSaved: 0.15,
  stability: 0.1,
  safety: 0.15,
  maintenance: 0.05,
  crossDepartmentSpread: 0.05,
};

/** 평가 수가 적은 신규 도구를 보정하기 위한 기준 (요구사항 16번) */
export interface RankingGuards {
  /** 순위에 포함되기 위한 최소 평가 수 */
  minimumEvaluations: number;
  /** 베이지안 보정에 쓸 가상 평가 수 */
  bayesianPriorWeight: number;
  /** 순위에서 제외할 상태 */
  excludedStatuses: readonly string[];
}

export const DEFAULT_RANKING_GUARDS: RankingGuards = {
  minimumEvaluations: 5,
  bayesianPriorWeight: 5,
  // SUSPENDED / RETIRED 도구와 보안사고 이력이 있는 도구는 추천에서 제외한다.
  excludedStatuses: ['SUSPENDED', 'RETIRED'],
};

export interface RankingSnapshot {
  id: string;
  generatedAt: string;
  weights: RankingWeights;
  guards: RankingGuards;
  entries: { toolId: ToolId; rank: number; totalScore: number }[];
}

export interface RankingService {
  calculateQualityScore(toolId: ToolId): Promise<AiResult<number>>;
  calculateAdoptionScore(toolId: ToolId): Promise<AiResult<number>>;
  calculateSafetyScore(toolId: ToolId): Promise<AiResult<number>>;
  calculateMaintenanceScore(toolId: ToolId): Promise<AiResult<number>>;
  generateRankingSnapshot(): Promise<AiResult<RankingSnapshot>>;
}

/* -------------------------------------------------------------------------- */
/* 개발자 토큰 (요구사항 17번)                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Campus Token 은 암호화폐가 아니라 플랫폼 내부의 비금전성 포인트다.
 * 1단계에서는 발급하지 않고 화면에 '향후 제공 예정'만 표시한다.
 */
export interface RewardLedgerEntry {
  id: string;
  developerId: UserId;
  month: string;
  amount: number;
  reason: string;
  /** 원장은 변경 불가능한 이력으로 저장한다 */
  previousEntryHash: string | null;
  entryHash: string;
  createdAt: string;
}

export interface RewardService {
  calculateMonthlyReward(developerId: UserId, month: string): Promise<AiResult<number>>;
  createRewardLedger(entry: Omit<RewardLedgerEntry, 'entryHash' | 'previousEntryHash'>): Promise<AiResult<RewardLedgerEntry>>;
  detectSuspiciousUsage(developerId: UserId, month: string): Promise<AiResult<string[]>>;
}

/* -------------------------------------------------------------------------- */
/* 통합                                                                        */
/* -------------------------------------------------------------------------- */

export interface AiServices {
  duplicateDetection: DuplicateDetectionService;
  riskAssessment: RiskAssessmentService;
  demandMatching: DemandMatchingService;
  multiLlmReview: MultiLlmReviewService;
  ranking: RankingService;
  reward: RewardService;
}

/** 각 기능이 켜져 있는지. 화면 안내에 사용한다. */
export interface AiFeatureFlags {
  duplicateDetection: boolean;
  riskAssessment: boolean;
  demandMatching: boolean;
  multiLlmReview: boolean;
  ranking: boolean;
  reward: boolean;
}
