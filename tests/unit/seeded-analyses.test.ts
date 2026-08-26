import { describe, expect, it } from 'vitest';
import {
  SEEDED_DEMAND_ANALYSES,
  SEEDED_DUPLICATE_ANALYSES,
  SEEDED_QUALITY_REVIEWS,
  SEEDED_RISK_ANALYSES,
} from '@/repositories/demo/seed-analyses';

/**
 * 데모에 심어 둔 분석이 실제로 쓸 만한지 지킨다.
 *
 * 이 테스트가 있는 이유는 실제로 두 번 데였기 때문이다.
 *
 * 1. `redact.ts` 가 도구 UUID 를 학번 패턴으로 보고 뭉개는 바람에, 모델이 낸
 *    판단을 우리가 "보낸 적 없는 도구"로 보고 전부 버렸다. 스크립트는 성공했다고
 *    찍었고 화면만 조용히 비었다.
 * 2. 참고(NOTE) 한 줄만 있어도 탈락시키는 바람에 품질검증이 6건 전부 FAIL 이었다.
 *    전부 같은 답이면 아무것도 구분하지 못한다.
 *
 * 둘 다 "돌아가긴 하는데 쓸모가 없는" 상태였다. 그건 타입으로도 lint 로도
 * 안 잡힌다. 값을 봐야 잡힌다.
 */

describe('심어 둔 분석', () => {
  it('네 가지가 모두 들어 있다', () => {
    expect(SEEDED_DUPLICATE_ANALYSES.length).toBeGreaterThan(0);
    expect(SEEDED_RISK_ANALYSES.length).toBeGreaterThan(0);
    expect(SEEDED_DEMAND_ANALYSES.length).toBeGreaterThan(0);
    expect(SEEDED_QUALITY_REVIEWS.length).toBeGreaterThan(0);
  });

  it('모든 분석에 모델 이름과 생성 시각이 붙어 있다', () => {
    const all = [
      ...SEEDED_DUPLICATE_ANALYSES,
      ...SEEDED_RISK_ANALYSES,
      ...SEEDED_DEMAND_ANALYSES,
      ...SEEDED_QUALITY_REVIEWS,
    ];

    for (const entry of all) {
      expect(entry.provenance.model.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(entry.provenance.generatedAt))).toBe(false);
      // 아직 아무도 확인하지 않은 상태로 심는다. 확인은 검토자가 화면에서 한다.
      expect(entry.provenance.humanReviewed).toBe(false);
    }
  });

  it('중복 판정이 실제로 하나 이상 나왔다 — 전부 0건이면 파이프라인이 샌 것이다', () => {
    const total = SEEDED_DUPLICATE_ANALYSES.reduce(
      (sum, entry) => sum + entry.findings.length,
      0,
    );
    expect(total).toBeGreaterThan(0);
  });

  it('중복 점수가 0~100 이다 — 0.8 같은 비율이 아니다', () => {
    for (const analysis of SEEDED_DUPLICATE_ANALYSES) {
      for (const finding of analysis.findings) {
        expect(finding.score).toBeGreaterThanOrEqual(0);
        expect(finding.score).toBeLessThanOrEqual(100);
        // 겹친다고 판정해 놓고 1점이면 비율을 그대로 넣은 것이다.
        expect(finding.score).toBeGreaterThan(1);
      }
    }
  });

  it('수요 매칭이 전부 "새로 만들어야 함"은 아니다', () => {
    const outcomes = new Set(SEEDED_DEMAND_ANALYSES.map((entry) => entry.outcome));
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('위험 등급이 한 가지로 몰려 있지 않다', () => {
    const levels = new Set(SEEDED_RISK_ANALYSES.map((entry) => entry.suggestedLevel));
    expect(levels.size).toBeGreaterThan(1);
  });

  it('위험 항목 제안에는 등록 내용 인용이 붙어 있다', () => {
    for (const analysis of SEEDED_RISK_ANALYSES) {
      for (const suggestion of analysis.suggestions.filter((entry) => entry.applies)) {
        // 근거를 못 대는 '해당됨'은 검토자의 시간만 쓴다.
        expect(suggestion.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('품질검증 판정이 한 가지로 몰려 있지 않다', () => {
    const verdicts = new Set(SEEDED_QUALITY_REVIEWS.map((entry) => entry.verdict));
    expect(verdicts.size).toBeGreaterThan(1);
  });

  it('품질검증은 관점마다 서로 다른 모델이 봤다 — 같으면 교차가 아니다', () => {
    for (const review of SEEDED_QUALITY_REVIEWS) {
      const models = new Set(review.results.map((result) => result.model));
      expect(models.size).toBe(review.results.length);
    }
  });
});
