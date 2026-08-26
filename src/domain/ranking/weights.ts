import type { ToolId } from '../shared/ids';

/**
 * 순위 계산에 쓰는 값들.
 *
 * 요구사항의 "순위 추천"을 **평균 평점 정렬로 만들지 않기 위해** 있다.
 * 평균 평점만 쓰면 평가 3개짜리 신규 도구가 평가 40개짜리 도구를 이긴다.
 * 그건 추천이 아니라 표본 부족이다.
 *
 * 가중치와 보정 기준은 순위 스냅샷에 함께 저장한다. 나중에 "왜 이 순위였나"를
 * 물으면 그때 쓴 값으로 다시 계산해 보일 수 있어야 한다.
 */

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

export interface RankingSnapshotEntry {
  toolId: ToolId;
  rank: number;
  /** 0~100 */
  totalScore: number;
}

export interface RankingSnapshot {
  id: string;
  generatedAt: string;
  weights: RankingWeights;
  guards: RankingGuards;
  entries: RankingSnapshotEntry[];
}
