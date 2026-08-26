import { describe, expect, it } from 'vitest';
import {
  aggregateQualityResults,
  type QualityFinding,
  type QualityReviewResult,
  type QualitySeverity,
} from '@/domain/analysis/types';

/**
 * 멀티 LLM 판정 합치기.
 *
 * 여기서 지키려는 것 하나: **갈렸을 때 자동으로 한쪽 편들지 않는다.**
 * 두 모델이 다르게 봤다는 건 사람이 봐야 한다는 뜻이지, 다수결로 정할 일이
 * 아니다. 관점이 둘뿐이라 다수결이라는 게 성립하지도 않는다.
 */

function finding(severity: QualitySeverity): QualityFinding {
  return { severity, title: '무언가', evidence: '어딘가', suggestion: '' };
}

function result(
  overrides: Partial<QualityReviewResult> & Pick<QualityReviewResult, 'passed'>,
): QualityReviewResult {
  return {
    kind: 'CONSISTENCY',
    model: 'claude-opus-5',
    findings: [],
    ...overrides,
  };
}

describe('aggregateQualityResults', () => {
  it('둘 다 통과하면 PASS', () => {
    expect(
      aggregateQualityResults([result({ passed: true }), result({ passed: true, kind: 'POLICY' })]),
    ).toEqual({ verdict: 'PASS', disagreement: false });
  });

  it('둘 다 걸리면 FAIL — 양쪽이 같은 결론이면 갈린 게 아니다', () => {
    const results = [
      result({ passed: false, findings: [finding('WARNING')] }),
      result({ passed: false, kind: 'POLICY', findings: [finding('WARNING')] }),
    ];
    expect(aggregateQualityResults(results)).toEqual({ verdict: 'FAIL', disagreement: false });
  });

  it('판정이 갈리면 NEEDS_HUMAN_REVIEW — 한쪽을 자동으로 따르지 않는다', () => {
    const results = [
      result({ passed: true }),
      result({ passed: false, kind: 'POLICY', findings: [finding('WARNING')] }),
    ];
    expect(aggregateQualityResults(results)).toEqual({
      verdict: 'NEEDS_HUMAN_REVIEW',
      disagreement: true,
    });
  });

  it('BLOCKER 가 하나라도 있으면 통과시키지 않는다', () => {
    const results = [
      result({ passed: true }),
      result({ passed: false, kind: 'POLICY', findings: [finding('BLOCKER')] }),
    ];
    expect(aggregateQualityResults(results).verdict).toBe('FAIL');
  });

  it('한쪽 호출이 실패하면 통과라도 사람 확인으로 돌린다 — 교차 검증이 안 됐다', () => {
    expect(aggregateQualityResults([result({ passed: true })])).toEqual({
      verdict: 'NEEDS_HUMAN_REVIEW',
      disagreement: false,
    });
  });

  it('하나뿐인 결과가 탈락이면 FAIL', () => {
    expect(
      aggregateQualityResults([result({ passed: false, findings: [finding('WARNING')] })]).verdict,
    ).toBe('FAIL');
  });

  it('결과가 하나도 없으면 사람 확인 — 통과로 넘기지 않는다', () => {
    expect(aggregateQualityResults([])).toEqual({
      verdict: 'NEEDS_HUMAN_REVIEW',
      disagreement: false,
    });
  });
});
