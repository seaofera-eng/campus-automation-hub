import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as CurrentUserModule from '@/lib/auth/current-user';
import { loadRanking } from '@/application/ranking/query';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { getRepositories } from '@/lib/di/container';
import { DEMO_CAMPUS_ID, demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 순위 (요구사항 "순위 추천").
 *
 * 도메인 계산은 `tests/unit/ranking.test.ts` 가 본다. 여기서는 **실제 시드
 * 데이터를 모아 오는 과정**이 맞게 돌아가는지 본다 — 평가·사용 기록·개선
 * 요청·체크리스트를 각각 다른 저장소에서 가져오므로 여기서 어긋나기 쉽다.
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

vi.mock('@/lib/auth/current-user', async () => {
  const actual = await vi.importActual<typeof CurrentUserModule>('@/lib/auth/current-user');
  return {
    ...actual,
    requireUser: async () => {
      const { getRepositories: get } = await import('@/lib/di/container');
      const { DEMO_USER_IDS } = await import('@/repositories/demo/seed-ids');
      const profile = await get().identity.getProfile(DEMO_USER_IDS.requester);
      if (!profile) throw new Error('데모 계정을 찾을 수 없습니다.');
      return profile;
    },
  };
});

describe('순위 화면 데이터', () => {
  it('시드 데이터로 순위가 만들어진다', async () => {
    const view = await loadRanking();

    expect(view.entries.length).toBeGreaterThan(0);
    // 1위부터 빠짐없이 매겨진다.
    expect(view.entries.map((entry) => entry.rank)).toEqual(
      view.entries.map((_, index) => index + 1),
    );
  });

  it('점수가 높은 순으로 정렬된다', async () => {
    const view = await loadRanking();
    const scores = view.entries.map((entry) => entry.totalScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('평가가 없는 도구는 평균을 null 로 둔다 — 0 으로 채우지 않는다', async () => {
    const view = await loadRanking();
    for (const entry of view.entries) {
      if (entry.evaluationCount === 0) {
        expect(entry.averageScore).toBeNull();
      }
    }
  });

  it('가중치와 보정 기준을 함께 돌려준다 — 화면이 근거를 적을 수 있어야 한다', async () => {
    const view = await loadRanking();

    const total = Object.values(view.weights).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 5);
    expect(view.guards.minimumEvaluations).toBeGreaterThan(0);
  });

  it('중단된 도구는 사유와 함께 순위에서 빠진다', async () => {
    const repositories = getRepositories();
    const page = await repositories.tools.listTools({ campusId: DEMO_CAMPUS_ID }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
    const target = page.items[0];
    if (!target) throw new Error('시드 데이터에 도구가 없습니다.');

    await repositories.tools.updateTool({ ...target, status: 'SUSPENDED' });

    const view = await loadRanking();

    expect(view.entries.map((entry) => entry.toolId)).not.toContain(target.id as string);
    expect(view.excluded.map((entry) => entry.toolId as string)).toContain(target.id as string);
  });

  it('실행한 사람 수를 센다 — 같은 사람이 여러 번 눌러도 한 명이다', async () => {
    const repositories = getRepositories();
    const actor = await demoProfile('requester');
    const page = await repositories.tools.listTools({ campusId: DEMO_CAMPUS_ID }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
    const target = page.items[0];
    if (!target) throw new Error('시드 데이터에 도구가 없습니다.');

    for (let index = 0; index < 3; index += 1) {
      await repositories.observability.insertUsageEvent({
        id: `usage-${index}`,
        campusId: DEMO_CAMPUS_ID,
        toolId: target.id,
        userId: actor.id,
        eventType: 'LAUNCH',
        occurredAt: new Date().toISOString(),
      });
    }

    const view = await loadRanking();
    const entry = view.entries.find((row) => row.toolId === (target.id as string));

    expect(entry?.distinctLaunchUsers).toBe(1);
  });

  it('추천 목록에는 평가가 충분한 도구만 오른다', async () => {
    const view = await loadRanking();

    for (const entry of view.recommended) {
      expect(entry.evaluationCount).toBeGreaterThanOrEqual(view.guards.minimumEvaluations);
      expect(entry.belowEvaluationThreshold).toBe(false);
    }
  });
});
