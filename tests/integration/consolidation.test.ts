import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as CurrentUserModule from '@/lib/auth/current-user';
import { loadConsolidation } from '@/application/consolidation/query';
import type { DuplicateVerdict } from '@/domain/analysis/types';
import type { ToolId, ToolVersionId } from '@/domain/shared/ids';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { getRepositories } from '@/lib/di/container';
import {
  DEMO_CAMPUS_ID,
  clearSeededAnalyses,
  setupIsolatedStore,
  teardownIsolatedStore,
} from './helpers';

/**
 * 통합 표준화.
 *
 * 묶는 계산은 `tests/unit/consolidation.test.ts` 가 본다. 여기서는
 * **저장된 중복 분석을 읽어 화면 데이터로 만드는 과정**을 본다.
 *
 * 특히: 분석을 안 돌렸을 때와 겹치는 게 없을 때를 **다르게** 낸다.
 * 화면 문구가 갈리는 지점이라 여기서 지켜야 한다.
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

// 시드의 진짜 분석을 치우고 이 테스트가 원하는 것만 심는다.
beforeEach(clearSeededAnalyses);

vi.mock('@/lib/auth/current-user', async () => {
  const actual = await vi.importActual<typeof CurrentUserModule>('@/lib/auth/current-user');
  return {
    ...actual,
    requireUser: async () => {
      const { getRepositories: get } = await import('@/lib/di/container');
      const { DEMO_USER_IDS } = await import('@/repositories/demo/seed-ids');
      const profile = await get().identity.getProfile(DEMO_USER_IDS.admin);
      if (!profile) throw new Error('데모 계정을 찾을 수 없습니다.');
      return profile;
    },
  };
});

async function tools() {
  const page = await getRepositories().tools.listTools({ campusId: DEMO_CAMPUS_ID }, 'RECENT', {
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });
  return page.items;
}

async function seedOverlap(
  sourceId: ToolId,
  sourceVersionId: ToolVersionId,
  candidateId: ToolId,
  verdict: DuplicateVerdict = 'HIGH_OVERLAP',
) {
  await getRepositories().analyses.upsertDuplicateAnalysis({
    toolVersionId: sourceVersionId,
    toolId: sourceId,
    comparedCount: 5,
    findings: [
      {
        candidateToolId: candidateId,
        verdict,
        score: 78,
        overlapping: ['같은 일을 합니다'],
        distinct: [],
        recommendation: 'MERGE_INTO_EXISTING',
        explanation: '',
        lexicalOverlap: 30,
      },
    ],
    provenance: {
      model: 'claude-opus-5',
      generatedAt: '2026-08-26T00:00:00.000Z',
      humanReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
    },
  });
}

describe('분석을 안 돌렸을 때', () => {
  it('분석한 도구 0건으로 알린다 — "겹치는 게 없다"와 구분해야 한다', async () => {
    const view = await loadConsolidation();

    expect(view.analyzedToolCount).toBe(0);
    expect(view.groups).toEqual([]);
  });
});

describe('묶음 만들기', () => {
  it('겹치는 도구 둘을 한 묶음으로 낸다', async () => {
    const [first, second] = await tools();
    if (!first || !second) throw new Error('도구가 두 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id);

    const view = await loadConsolidation();

    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]?.tools.map((tool) => tool.toolId).sort()).toEqual(
      [first.id as string, second.id as string].sort(),
    );
  });

  it('한 다리 건너 이어진 셋도 한 묶음이다', async () => {
    const [first, second, third] = await tools();
    if (!first || !second || !third) throw new Error('도구가 세 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id);
    await seedOverlap(second.id, second.currentVersionId, third.id);

    const view = await loadConsolidation();

    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]?.tools).toHaveLength(3);
  });

  it('분석은 있지만 겹치는 것이 없으면 묶음이 비고 분석 건수는 남는다', async () => {
    const [first] = await tools();
    if (!first) throw new Error('시드 데이터에 도구가 없습니다.');

    await getRepositories().analyses.upsertDuplicateAnalysis({
      toolVersionId: first.currentVersionId,
      toolId: first.id,
      comparedCount: 5,
      findings: [],
      provenance: {
        model: 'claude-opus-5',
        generatedAt: '2026-08-26T00:00:00.000Z',
        humanReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    const view = await loadConsolidation();

    expect(view.analyzedToolCount).toBe(1);
    expect(view.groups).toEqual([]);
  });

  it('RELATED 로만 이어진 것은 묶지 않는다', async () => {
    const [first, second] = await tools();
    if (!first || !second) throw new Error('도구가 두 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id, 'RELATED');

    expect((await loadConsolidation()).groups).toEqual([]);
  });
});

describe('기능 비교표와 통합 제안', () => {
  it('기준 도구를 하나만 제안한다', async () => {
    const [first, second] = await tools();
    if (!first || !second) throw new Error('도구가 두 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id);

    const group = (await loadConsolidation()).groups[0];

    expect(group?.tools.filter((tool) => tool.isSuggestedBase)).toHaveLength(1);
    expect(group?.suggestedBaseToolId).not.toBeNull();
  });

  it('기능 표의 각 줄에 도구별 원래 표현이 남는다', async () => {
    const [first, second] = await tools();
    if (!first || !second) throw new Error('도구가 두 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id);

    const group = (await loadConsolidation()).groups[0];
    const row = group?.featureRows[0];

    expect(row).toBeDefined();
    // 표현이 비어 있으면 잘못 묶였는지 사람이 확인할 수 없다.
    for (const written of Object.values(row?.byTool ?? {})) {
      expect(written.length).toBeGreaterThan(0);
    }
  });

  it('흡수할 기능은 기준 도구에 없는 것만 나온다', async () => {
    const [first, second] = await tools();
    if (!first || !second) throw new Error('도구가 두 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id);

    const group = (await loadConsolidation()).groups[0];
    const baseId = group?.suggestedBaseToolId;

    for (const entry of group?.absorbable ?? []) {
      const row = group?.featureRows.find((candidate) => candidate.label === entry.label);
      expect(row?.byTool[baseId ?? '']).toBeUndefined();
    }
  });

  it('분석 뒤 도구가 지워져 한 건만 남으면 묶음이 아니다', async () => {
    const repositories = getRepositories();
    const [first, second] = await tools();
    if (!first || !second) throw new Error('도구가 두 건 이상 필요합니다.');

    await seedOverlap(first.id, first.currentVersionId, second.id);
    await repositories.tools.updateTool({ ...second, deletedAt: new Date().toISOString() });

    expect((await loadConsolidation()).groups).toEqual([]);
  });
});

describe('권한', () => {
  it('도구 관리 권한이 없으면 볼 수 없다', async () => {
    const repositories = getRepositories();
    const { DEMO_USER_IDS } = await import('@/repositories/demo/seed-ids');
    const admin = await repositories.identity.getProfile(DEMO_USER_IDS.admin);
    if (!admin) throw new Error('데모 계정을 찾을 수 없습니다.');

    await repositories.identity.updateProfile({
      ...admin,
      adminPermissions: admin.adminPermissions.filter(
        (permission) => permission !== 'MANAGE_TOOLS',
      ),
    });

    await expect(loadConsolidation()).rejects.toThrow();
  });
});
