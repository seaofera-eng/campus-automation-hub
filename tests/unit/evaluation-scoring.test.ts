import { describe, expect, it } from 'vitest';
import {
  assertValidScores,
  bayesianAdjustedScore,
  summarizeEvaluations,
} from '@/domain/evaluation/scoring';
import { EVALUATION_CRITERIA } from '@/domain/evaluation/types';
import type { EvaluationScores, ToolEvaluation } from '@/domain/evaluation/types';
import { DomainError } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { CampusId, EvaluationId, ToolId, ToolVersionId, UserId } from '@/domain/shared/ids';

function scores(value: number): EvaluationScores {
  return {
    problemSolving: value,
    workEfficiency: value,
    usability: value,
    stability: value,
    accuracy: value,
    spreadPotential: value,
    overall: value,
  };
}

function evaluation(overrides: Partial<ToolEvaluation> = {}): ToolEvaluation {
  return {
    id: asId<EvaluationId>('eval-1'),
    campusId: asId<CampusId>('campus-1'),
    toolId: asId<ToolId>('tool-1'),
    toolVersionId: asId<ToolVersionId>('version-1'),
    evaluatorUserId: asId<UserId>('user-1'),
    scores: scores(4),
    comment: '',
    revisionCount: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('평가 점수 검증 (요구사항 9번)', () => {
  it('1~5점 정수는 통과한다', () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(() => assertValidScores(scores(value))).not.toThrow();
    }
  });

  it('범위를 벗어난 점수는 거부한다', () => {
    expect(() => assertValidScores(scores(0))).toThrowError(DomainError);
    expect(() => assertValidScores(scores(6))).toThrowError(DomainError);
    expect(() => assertValidScores(scores(-1))).toThrowError(DomainError);
  });

  it('정수가 아니면 거부한다', () => {
    expect(() => assertValidScores(scores(3.5))).toThrowError(DomainError);
  });

  it.each(EVALUATION_CRITERIA)('%s 가 빠지면 해당 필드 오류를 돌려준다', (criterion) => {
    const partial: Partial<EvaluationScores> = { ...scores(4) };
    delete partial[criterion];

    try {
      assertValidScores(partial);
      expect.unreachable('예외가 발생해야 한다');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      const domainError = error as DomainError;
      expect(domainError.code).toBe('VALIDATION_FAILED');
      // 어떤 항목이 문제인지 폼에서 바로 표시할 수 있어야 한다.
      expect(domainError.fields?.[criterion]).toBeTruthy();
    }
  });
});

describe('평가 집계', () => {
  it('평가가 없으면 평균은 null 이다 — 0점으로 표시하지 않는다', () => {
    const summary = summarizeEvaluations([]);
    expect(summary.count).toBe(0);
    expect(summary.averages).toBeNull();
    expect(summary.averageOverall).toBeNull();
  });

  it('항목별 평균을 소수점 첫째 자리까지 계산한다', () => {
    const summary = summarizeEvaluations([
      evaluation({ scores: scores(4) }),
      evaluation({ scores: scores(5) }),
      evaluation({ scores: scores(3) }),
    ]);
    expect(summary.count).toBe(3);
    expect(summary.averageOverall).toBe(4);
    expect(summary.averages?.usability).toBe(4);
  });

  it('삭제된 평가는 평균에서 제외한다', () => {
    const summary = summarizeEvaluations([
      evaluation({ scores: scores(5) }),
      evaluation({ scores: scores(1), deletedAt: '2026-07-02T00:00:00.000Z' }),
    ]);
    expect(summary.count).toBe(1);
    expect(summary.averageOverall).toBe(5);
  });

  it('종합 만족도 분포를 1~5점으로 채운다', () => {
    const summary = summarizeEvaluations([
      evaluation({ scores: { ...scores(4), overall: 5 } }),
      evaluation({ scores: { ...scores(4), overall: 5 } }),
      evaluation({ scores: { ...scores(4), overall: 2 } }),
    ]);
    expect(summary.overallDistribution[5]).toBe(2);
    expect(summary.overallDistribution[2]).toBe(1);
    expect(summary.overallDistribution[1]).toBe(0);
  });
});

describe('베이지안 보정 (3단계 준비용, 현재 화면에서 사용하지 않음)', () => {
  it('평가가 없으면 사전 평균을 그대로 돌려준다', () => {
    expect(bayesianAdjustedScore(5, 0, 3.5, 5)).toBe(3.5);
  });

  it('평가 수가 적으면 사전 평균 쪽으로 끌어당긴다', () => {
    const few = bayesianAdjustedScore(5, 1, 3, 5);
    const many = bayesianAdjustedScore(5, 100, 3, 5);
    expect(few).toBeLessThan(many);
    expect(many).toBeGreaterThan(4.5);
  });
});
