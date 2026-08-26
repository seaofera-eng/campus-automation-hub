import { bayesianAdjustedScore } from '../evaluation/scoring';
import type { ToolId } from '../shared/ids';
import type { RiskLevel } from '../tool/types';

/**
 * 도구 순위 (요구사항 "순위 추천").
 *
 * ## 평균 평점으로 줄 세우지 않는 이유
 *
 * 평가 3건에 5.0점인 도구가 평가 40건에 4.3점인 도구를 이긴다. 그건 추천이
 * 아니라 표본 부족이다. 학내 플랫폼에서는 이게 특히 나쁘게 작동한다 — 만든
 * 사람이 아는 사람 몇 명에게 부탁하면 1위가 된다.
 *
 * 그래서 다섯 축을 함께 본다. 어느 축도 혼자서 순위를 정하지 못한다.
 *
 * ## 다섯 축
 *
 * | 축 | 무엇을 보는가 | 왜 |
 * |---|---|---|
 * | 만족도 | 평가 평균 (베이지안 보정) | 쓴 사람의 판단 |
 * | 실제 쓰임 | 실행한 **사람 수** | 열어만 본 것은 쓴 게 아니다 |
 * | 안정성 | 열려 있는 오류 신고 | 고장 난 채 방치된 도구를 걸러 낸다 |
 * | 안전 | 확정된 위험 등급 | 위험한 도구를 위로 올리지 않는다 |
 * | 관리 상태 | 마지막 갱신 시점 | 버려진 도구를 걸러 낸다 |
 *
 * ## 계산 결과를 재현할 수 있어야 한다
 *
 * 가중치와 보정 기준을 스냅샷에 함께 저장한다. "왜 이 순위였나"를 나중에
 * 물으면 그때 쓴 값으로 다시 계산해 보일 수 있다.
 *
 * 이 파일은 순수 계산이다. 저장소도 모델도 부르지 않는다.
 */

/* -------------------------------------------------------------------------- */
/* 가중치 · 보정 기준                                                          */
/* -------------------------------------------------------------------------- */

export interface RankingWeights {
  /** 쓴 사람들의 평가 */
  satisfaction: number;
  /** 실제로 얼마나 쓰이는가 */
  adoption: number;
  /** 고장 나 있지 않은가 */
  stability: number;
  /** 위험하지 않은가 */
  safety: number;
  /** 관리되고 있는가 */
  maintenance: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  satisfaction: 0.35,
  adoption: 0.25,
  stability: 0.15,
  safety: 0.15,
  maintenance: 0.1,
};

export interface RankingGuards {
  /**
   * 추천 목록에 오르기 위한 최소 평가 수.
   *
   * 이 수에 못 미치는 도구도 순위표에는 나온다 — 빼 버리면 새로 만든 좋은
   * 도구가 영원히 안 보인다. 대신 '표본 부족'으로 표시하고 추천에서만 뺀다.
   */
  minimumEvaluations: number;
  /**
   * 베이지안 보정에 쓸 가상 평가 수.
   *
   * 평가가 적을수록 전체 평균 쪽으로 끌어당긴다. 이 값이 클수록 강하게 끌린다.
   */
  bayesianPriorWeight: number;
  /** 순위에서 아예 빼는 상태 */
  excludedStatuses: readonly string[];
  /** 이 등급 이상이면 순위에서 뺀다. 위험한 도구를 추천할 수는 없다. */
  excludedRiskLevel: RiskLevel;
  /** 며칠 지나면 '방치'로 보는가 */
  staleAfterDays: number;
}

export const DEFAULT_RANKING_GUARDS: RankingGuards = {
  minimumEvaluations: 3,
  bayesianPriorWeight: 5,
  excludedStatuses: ['SUSPENDED', 'RETIRED'],
  excludedRiskLevel: 'CRITICAL',
  // 반년 넘게 손대지 않았으면 관리 점수를 0 으로 본다.
  staleAfterDays: 180,
};

/* -------------------------------------------------------------------------- */
/* 입력                                                                        */
/* -------------------------------------------------------------------------- */

/** 도구 한 건에 대해 순위 계산이 필요로 하는 것 전부. */
export interface RankingInput {
  toolId: ToolId;
  name: string;
  status: string;
  /** 평가 개수 */
  evaluationCount: number;
  /** 평가 평균 (1~5). 평가가 없으면 null. */
  averageScore: number | null;
  /** 실행 링크를 누른 **서로 다른 사람** 수 */
  distinctLaunchUsers: number;
  /** 아직 처리되지 않은 오류 신고 수 */
  openBugReports: number;
  /** 처리가 끝난 개선 요청 수 (오류 포함) */
  resolvedRequests: number;
  /** 검토자가 확정한 위험 등급. 체크리스트가 없으면 null. */
  riskLevel: RiskLevel | null;
  /** 현재 버전을 마지막으로 손댄 시각 (ISO) */
  lastUpdatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* 축별 점수 — 전부 0~100                                                       */
/* -------------------------------------------------------------------------- */

/**
 * 만족도. 베이지안 보정을 건다.
 *
 * `(평균 × 평가수 + 전체평균 × 가상평가수) / (평가수 + 가상평가수)`
 *
 * 평가가 없으면 전체 평균이 그대로 나온다 — 0 점이 아니다. 평가가 없다는 건
 * 나쁘다는 뜻이 아니라 모른다는 뜻이고, 그 차이를 지켜야 한다.
 */
export function satisfactionScore(
  input: Pick<RankingInput, 'evaluationCount' | 'averageScore'>,
  campusAverage: number,
  priorWeight: number,
): number {
  const corrected = bayesianAdjustedScore(
    input.averageScore ?? campusAverage,
    input.evaluationCount,
    campusAverage,
    priorWeight,
  );

  // 1~5 를 0~100 으로. 1점이 0점이 되어야 척도가 맞는다.
  return round1(((corrected - 1) / 4) * 100);
}

/**
 * 실제 쓰임. 사람 수를 로그로 눌러 담는다.
 *
 * 그냥 세면 이용자가 많은 부서의 도구가 항상 이긴다. 로그를 씌우면 0명과
 * 5명의 차이는 크게, 50명과 100명의 차이는 작게 본다 — 실제 체감과 맞는다.
 *
 * 조회 수를 안 쓰는 이유: 열어만 보고 안 쓴 것과 쓴 것을 구분하지 못한다.
 * 게다가 조회는 만든 사람이 스스로 올릴 수 있다.
 */
export function adoptionScore(distinctLaunchUsers: number, maxUsers: number): number {
  if (distinctLaunchUsers <= 0) return 0;
  if (maxUsers <= 1) return 100;

  return round1((Math.log1p(distinctLaunchUsers) / Math.log1p(maxUsers)) * 100);
}

/**
 * 안정성. 열려 있는 오류 신고가 몇 건인지.
 *
 * 신고가 아예 없는 것과 신고가 다 처리된 것을 다르게 보지 않는다 — 둘 다
 * 지금 고장 나 있지 않다. 처리된 건을 가산점으로 주면 오류가 많이 났던 도구가
 * 유리해진다.
 */
export function stabilityScore(openBugReports: number): number {
  if (openBugReports <= 0) return 100;
  // 1건 -> 70, 2건 -> 49, 3건 -> 34…
  return round1(100 * 0.7 ** openBugReports);
}

const RISK_SCORE: Record<RiskLevel, number> = {
  LOW: 100,
  MEDIUM: 75,
  HIGH: 40,
  CRITICAL: 0,
};

/**
 * 안전. 검토자가 확정한 등급을 쓴다.
 *
 * 체크리스트가 없으면 50 이다. 100 도 0 도 아니다 — 안전한지 위험한지
 * **아직 모르는 것**이고, 모르는 것을 안전으로 치면 검토를 건너뛴 도구가
 * 유리해진다.
 */
export function safetyScore(riskLevel: RiskLevel | null): number {
  return riskLevel === null ? 50 : RISK_SCORE[riskLevel];
}

/**
 * 관리 상태. 마지막으로 손댄 지 얼마나 됐는지.
 *
 * 개선 요청이 처리된 적이 있으면 조금 올려 준다 — 사람이 붙어 있다는 신호다.
 */
export function maintenanceScore(
  lastUpdatedAt: string,
  now: Date,
  staleAfterDays: number,
  resolvedRequests: number,
): number {
  const updated = new Date(lastUpdatedAt).getTime();
  // 날짜가 깨져 있으면 판단 근거가 없다. 방치로 치지 않고 중간을 준다.
  if (!Number.isFinite(updated)) return 50;

  const days = (now.getTime() - updated) / (1000 * 60 * 60 * 24);
  const freshness = Math.max(0, Math.min(1, 1 - days / staleAfterDays));

  // 처리된 요청 3건이면 가산점이 최대(20점)에 가까워진다.
  const responsiveness = resolvedRequests > 0 ? Math.min(20, resolvedRequests * 7) : 0;

  return round1(Math.min(100, freshness * 80 + responsiveness));
}

/* -------------------------------------------------------------------------- */
/* 순위                                                                        */
/* -------------------------------------------------------------------------- */

export interface RankingBreakdown {
  satisfaction: number;
  adoption: number;
  stability: number;
  safety: number;
  maintenance: number;
}

export interface RankingEntry {
  toolId: ToolId;
  name: string;
  rank: number;
  /** 0~100 */
  totalScore: number;
  breakdown: RankingBreakdown;
  evaluationCount: number;
  /** 평가가 모자라 추천에서 빠졌는가. 순위표에는 그대로 나온다. */
  belowEvaluationThreshold: boolean;
}

export interface RankingSnapshot {
  generatedAt: string;
  weights: RankingWeights;
  guards: RankingGuards;
  entries: RankingEntry[];
  /** 순위에서 아예 빠진 도구와 그 이유 */
  excluded: { toolId: ToolId; name: string; reason: string }[];
  /** 베이지안 보정의 기준이 된 전체 평균 (1~5) */
  campusAverage: number;
}

const RISK_ORDER: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/**
 * 순위를 만든다.
 *
 * 제외 사유를 버리지 않고 함께 돌려준다. "왜 우리 도구가 순위에 없냐"는
 * 물음에 답할 수 있어야 한다.
 */
export function buildRanking(
  inputs: readonly RankingInput[],
  options: {
    now: Date;
    weights?: RankingWeights;
    guards?: RankingGuards;
  },
): RankingSnapshot {
  const weights = options.weights ?? DEFAULT_RANKING_WEIGHTS;
  const guards = options.guards ?? DEFAULT_RANKING_GUARDS;

  const excluded: RankingSnapshot['excluded'] = [];
  const eligible: RankingInput[] = [];

  for (const input of inputs) {
    if (guards.excludedStatuses.includes(input.status)) {
      excluded.push({ toolId: input.toolId, name: input.name, reason: '중단되었거나 폐기된 도구' });
      continue;
    }
    if (
      input.riskLevel !== null &&
      RISK_ORDER[input.riskLevel] >= RISK_ORDER[guards.excludedRiskLevel]
    ) {
      excluded.push({ toolId: input.toolId, name: input.name, reason: '위험 등급이 높은 도구' });
      continue;
    }
    eligible.push(input);
  }

  // 베이지안 보정의 기준. 평가가 하나도 없으면 척도의 가운데(3점)를 쓴다.
  const rated = eligible.filter((input) => input.averageScore !== null);
  const campusAverage =
    rated.length > 0
      ? rated.reduce((sum, input) => sum + (input.averageScore ?? 0), 0) / rated.length
      : 3;

  const maxUsers = Math.max(1, ...eligible.map((input) => input.distinctLaunchUsers));

  const scored = eligible.map((input) => {
    const breakdown: RankingBreakdown = {
      satisfaction: satisfactionScore(input, campusAverage, guards.bayesianPriorWeight),
      adoption: adoptionScore(input.distinctLaunchUsers, maxUsers),
      stability: stabilityScore(input.openBugReports),
      safety: safetyScore(input.riskLevel),
      maintenance: maintenanceScore(
        input.lastUpdatedAt,
        options.now,
        guards.staleAfterDays,
        input.resolvedRequests,
      ),
    };

    const totalScore = round1(
      breakdown.satisfaction * weights.satisfaction +
        breakdown.adoption * weights.adoption +
        breakdown.stability * weights.stability +
        breakdown.safety * weights.safety +
        breakdown.maintenance * weights.maintenance,
    );

    return {
      toolId: input.toolId,
      name: input.name,
      totalScore,
      breakdown,
      evaluationCount: input.evaluationCount,
      belowEvaluationThreshold: input.evaluationCount < guards.minimumEvaluations,
    };
  });

  // 점수가 같으면 평가가 많은 쪽을 위로. 표본이 많은 판단이 더 믿을 만하다.
  scored.sort(
    (left, right) =>
      right.totalScore - left.totalScore || right.evaluationCount - left.evaluationCount,
  );

  return {
    generatedAt: options.now.toISOString(),
    weights,
    guards,
    entries: scored.map((entry, index) => ({ ...entry, rank: index + 1 })),
    excluded,
    campusAverage: round1(campusAverage),
  };
}

/** 추천으로 내보낼 상위 몇 건. 표본이 모자란 도구는 여기서 빠진다. */
export function recommendedFrom(snapshot: RankingSnapshot, limit: number): RankingEntry[] {
  return snapshot.entries.filter((entry) => !entry.belowEvaluationThreshold).slice(0, limit);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
