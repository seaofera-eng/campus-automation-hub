import { DomainError } from '../shared/errors';
import type { EvaluationCriterion, EvaluationScores, EvaluationSummary, ToolEvaluation } from './types';
import {
  EVALUATION_CRITERIA,
  EVALUATION_CRITERION_LABELS,
  MAX_SCORE,
  MIN_SCORE,
} from './types';

/** 7개 항목이 모두 1~5 정수인지 검증한다. 실패하면 필드 단위 오류를 던진다. */
export function assertValidScores(scores: Partial<EvaluationScores>): asserts scores is EvaluationScores {
  const fields: Record<string, string> = {};

  for (const criterion of EVALUATION_CRITERIA) {
    const value = scores[criterion];
    if (value === undefined || value === null) {
      fields[criterion] = `${EVALUATION_CRITERION_LABELS[criterion]} 점수를 선택해 주세요.`;
      continue;
    }
    if (!Number.isInteger(value)) {
      fields[criterion] = `${MIN_SCORE}점에서 ${MAX_SCORE}점 사이의 정수를 선택해 주세요.`;
      continue;
    }
    if (value < MIN_SCORE || value > MAX_SCORE) {
      fields[criterion] = `${MIN_SCORE}점에서 ${MAX_SCORE}점 사이만 입력할 수 있습니다.`;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new DomainError(
      'VALIDATION_FAILED',
      '평가 점수를 다시 확인해 주세요. 7개 항목 모두 1점에서 5점 사이로 선택해야 저장할 수 있습니다.',
      fields,
    );
  }
}

/** 소수점 첫째 자리까지 반올림 */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function summarizeEvaluations(evaluations: readonly ToolEvaluation[]): EvaluationSummary {
  const active = evaluations.filter((evaluation) => evaluation.deletedAt === null);

  const overallDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const evaluation of active) {
    const overall = evaluation.scores.overall;
    overallDistribution[overall] = (overallDistribution[overall] ?? 0) + 1;
  }

  if (active.length === 0) {
    return { count: 0, averages: null, averageOverall: null, overallDistribution };
  }

  const averages = {} as Record<EvaluationCriterion, number>;
  for (const criterion of EVALUATION_CRITERIA) {
    const total = active.reduce((sum, evaluation) => sum + evaluation.scores[criterion], 0);
    averages[criterion] = round1(total / active.length);
  }

  return {
    count: active.length,
    averages,
    averageOverall: averages.overall,
    overallDistribution,
  };
}

/**
 * 2·3단계 순위 산정(요구사항 16번)을 대비한 자리.
 *
 * 지금은 단순 평균만 노출하고 순위를 만들지 않는다. 평가 수가 적은 신규 도구가
 * 과대평가되지 않도록, 실제 순위를 도입할 때는 아래 베이지안 보정을 사용한다.
 *
 * 이 함수는 현재 어떤 화면에서도 호출하지 않는다. RankingService가 붙을 때 사용한다.
 *
 * @param average       해당 도구의 평균 점수
 * @param count         해당 도구의 평가 수
 * @param priorMean     전체 도구의 평균 (사전 평균)
 * @param priorWeight   사전 평균에 부여할 가상 평가 수
 */
export function bayesianAdjustedScore(
  average: number,
  count: number,
  priorMean: number,
  priorWeight: number,
): number {
  if (count <= 0) return priorMean;
  return round1((priorWeight * priorMean + count * average) / (priorWeight + count));
}
