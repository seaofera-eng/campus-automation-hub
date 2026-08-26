import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RANKING_GUARDS,
  adoptionScore,
  buildRanking,
  maintenanceScore,
  recommendedFrom,
  safetyScore,
  satisfactionScore,
  stabilityScore,
  type RankingInput,
} from '@/domain/ranking';
import type { ToolId } from '@/domain/shared/ids';

const NOW = new Date('2026-08-26T00:00:00.000Z');

function input(
  overrides: Omit<Partial<RankingInput>, 'toolId'> & { toolId: string },
): RankingInput {
  return {
    name: '도구',
    status: 'APPROVED',
    evaluationCount: 0,
    averageScore: null,
    distinctLaunchUsers: 0,
    openBugReports: 0,
    resolvedRequests: 0,
    riskLevel: null,
    lastUpdatedAt: NOW.toISOString(),
    ...overrides,
    toolId: overrides.toolId as ToolId,
  };
}

describe('satisfactionScore — 베이지안 보정', () => {
  it('평가가 적으면 전체 평균 쪽으로 끌린다', () => {
    // 평가 2건에 5.0점. 전체 평균은 3.0.
    const few = satisfactionScore({ evaluationCount: 2, averageScore: 5 }, 3, 5);
    // 평가 40건에 4.3점.
    const many = satisfactionScore({ evaluationCount: 40, averageScore: 4.3 }, 3, 5);

    // 표본이 적은 만점짜리가 표본이 많은 4.3점을 이기지 못한다.
    expect(few).toBeLessThan(many);
  });

  it('평가가 없으면 전체 평균이 나온다 — 0 점이 아니다', () => {
    const score = satisfactionScore({ evaluationCount: 0, averageScore: null }, 3, 5);
    // 3점은 척도의 가운데이므로 50점.
    expect(score).toBe(50);
  });

  it('1점은 0점, 5점은 100점으로 펼친다', () => {
    expect(satisfactionScore({ evaluationCount: 1000, averageScore: 1 }, 1, 5)).toBe(0);
    expect(satisfactionScore({ evaluationCount: 1000, averageScore: 5 }, 5, 5)).toBe(100);
  });
});

describe('adoptionScore', () => {
  it('아무도 안 쓰면 0', () => {
    expect(adoptionScore(0, 50)).toBe(0);
  });

  it('제일 많이 쓰이는 도구가 100', () => {
    expect(adoptionScore(50, 50)).toBe(100);
  });

  it('로그를 씌워 큰 수의 차이를 눌러 담는다', () => {
    // 0명과 5명의 차이가 50명과 100명의 차이보다 커야 한다.
    const smallGap = adoptionScore(5, 100) - adoptionScore(1, 100);
    const largeGap = adoptionScore(100, 100) - adoptionScore(50, 100);
    expect(smallGap).toBeGreaterThan(largeGap);
  });
});

describe('stabilityScore', () => {
  it('열린 오류 신고가 없으면 100', () => {
    expect(stabilityScore(0)).toBe(100);
  });

  it('신고가 쌓일수록 빠르게 떨어진다', () => {
    expect(stabilityScore(1)).toBeLessThan(100);
    expect(stabilityScore(3)).toBeLessThan(stabilityScore(1));
  });
});

describe('safetyScore', () => {
  it('체크리스트가 없으면 50 — 모르는 것을 안전으로 치지 않는다', () => {
    expect(safetyScore(null)).toBe(50);
  });

  it('등급이 높을수록 낮다', () => {
    expect(safetyScore('LOW')).toBe(100);
    expect(safetyScore('CRITICAL')).toBe(0);
    expect(safetyScore('HIGH')).toBeLessThan(safetyScore('MEDIUM'));
  });
});

describe('maintenanceScore', () => {
  it('방금 갱신했으면 높다', () => {
    expect(maintenanceScore(NOW.toISOString(), NOW, 180, 0)).toBe(80);
  });

  it('오래 손대지 않았으면 0 에 가까워진다', () => {
    const old = new Date('2025-01-01T00:00:00.000Z').toISOString();
    expect(maintenanceScore(old, NOW, 180, 0)).toBe(0);
  });

  it('개선 요청을 처리한 이력이 있으면 올려 준다', () => {
    const old = new Date('2025-01-01T00:00:00.000Z').toISOString();
    expect(maintenanceScore(old, NOW, 180, 3)).toBeGreaterThan(
      maintenanceScore(old, NOW, 180, 0),
    );
  });

  it('날짜가 깨져 있으면 중간값을 준다 — 방치로 몰지 않는다', () => {
    expect(maintenanceScore('언젠가', NOW, 180, 0)).toBe(50);
  });
});

describe('buildRanking', () => {
  it('중단·폐기된 도구를 사유와 함께 뺀다', () => {
    const snapshot = buildRanking(
      [input({ toolId: 'a' }), input({ toolId: 'b', status: 'SUSPENDED', name: '중단된 도구' })],
      { now: NOW },
    );

    expect(snapshot.entries.map((entry) => String(entry.toolId))).toEqual(['a']);
    expect(snapshot.excluded.map((entry) => [String(entry.toolId), entry.reason])).toEqual([
      ['b', '중단되었거나 폐기된 도구'],
    ]);
  });

  it('위험 등급이 CRITICAL 인 도구를 뺀다', () => {
    const snapshot = buildRanking(
      [input({ toolId: 'a' }), input({ toolId: 'danger', riskLevel: 'CRITICAL' })],
      { now: NOW },
    );

    expect(snapshot.entries.map((entry) => String(entry.toolId))).toEqual(['a']);
    expect(snapshot.excluded[0]?.reason).toBe('위험 등급이 높은 도구');
  });

  it('평가 수가 적어도 순위표에는 나오되 표시가 붙는다', () => {
    const snapshot = buildRanking(
      [input({ toolId: 'new', evaluationCount: 1, averageScore: 5 })],
      { now: NOW },
    );

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.entries[0]?.belowEvaluationThreshold).toBe(true);
    // 추천에서는 빠진다.
    expect(recommendedFrom(snapshot, 5)).toEqual([]);
  });

  it('만점 하나짜리 신규 도구가 1위를 차지하지 못한다', () => {
    const snapshot = buildRanking(
      [
        input({
          toolId: 'popular',
          name: '많이 쓰는 도구',
          evaluationCount: 30,
          averageScore: 4.3,
          distinctLaunchUsers: 40,
          riskLevel: 'LOW',
        }),
        input({
          toolId: 'fresh',
          name: '평가 하나짜리',
          evaluationCount: 1,
          averageScore: 5,
          distinctLaunchUsers: 1,
        }),
      ],
      { now: NOW },
    );

    expect(String(snapshot.entries[0]?.toolId)).toBe('popular');
  });

  it('가중치와 보정 기준을 스냅샷에 함께 담는다 — 나중에 재현할 수 있어야 한다', () => {
    const snapshot = buildRanking([input({ toolId: 'a' })], { now: NOW });

    expect(snapshot.weights).toEqual(expect.objectContaining({ satisfaction: 0.35 }));
    expect(snapshot.guards).toEqual(DEFAULT_RANKING_GUARDS);
    expect(snapshot.generatedAt).toBe(NOW.toISOString());
  });

  it('가중치 합이 1 이라 총점이 0~100 을 벗어나지 않는다', () => {
    const snapshot = buildRanking(
      [
        input({
          toolId: 'best',
          evaluationCount: 100,
          averageScore: 5,
          distinctLaunchUsers: 100,
          riskLevel: 'LOW',
          resolvedRequests: 10,
        }),
        input({
          toolId: 'worst',
          evaluationCount: 100,
          averageScore: 1,
          openBugReports: 10,
          riskLevel: 'HIGH',
          lastUpdatedAt: '2020-01-01T00:00:00.000Z',
        }),
      ],
      { now: NOW },
    );

    for (const entry of snapshot.entries) {
      expect(entry.totalScore).toBeGreaterThanOrEqual(0);
      expect(entry.totalScore).toBeLessThanOrEqual(100);
    }
  });

  it('도구가 하나도 없어도 터지지 않는다', () => {
    const snapshot = buildRanking([], { now: NOW });
    expect(snapshot.entries).toEqual([]);
    // 평가가 없으면 척도의 가운데를 기준으로 쓴다.
    expect(snapshot.campusAverage).toBe(3);
  });

  it('점수가 같으면 평가가 많은 쪽을 위로 둔다', () => {
    const snapshot = buildRanking(
      [
        input({ toolId: 'few', evaluationCount: 3, averageScore: 4 }),
        input({ toolId: 'many', evaluationCount: 20, averageScore: 4 }),
      ],
      { now: NOW },
    );

    // 보정 때문에 점수가 완전히 같지는 않지만, 표본이 많은 쪽이 위여야 한다.
    expect(String(snapshot.entries[0]?.toolId)).toBe('many');
  });
});
