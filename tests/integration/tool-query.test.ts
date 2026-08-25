import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/domain/identity/types';
import type * as CurrentUserModule from '@/lib/auth/current-user';

/**
 * 세션은 쿠키에서 읽으므로 테스트에서는 "지금 로그인한 사람"만 갈아 끼운다.
 * 권한 판단 로직 자체(`toActor`, `assertCan`)는 진짜를 그대로 쓴다.
 */
let currentUser: Profile | null = null;

vi.mock('@/lib/auth/current-user', async (importOriginal) => {
  const actual = await importOriginal<typeof CurrentUserModule>();
  return {
    ...actual,
    getCurrentProfile: async () => currentUser,
    requireUser: async () => {
      if (!currentUser) throw new Error('테스트에서 로그인 사용자를 지정하지 않았습니다.');
      return currentUser;
    },
  };
});

const { canRead, listTools, loadToolDetail } = await import('@/application/tools/query');
const { saveDraft } = await import('@/application/tools/register');
const { toActor } = await import('@/lib/auth/current-user');
const { getRepositories } = await import('@/lib/di/container');
const { emptyToolForm } = await import('@/lib/validation/tool');
const { buildToolHref, parseToolQuery } = await import('@/lib/validation/tool-query');
const { DEMO_TOOL_IDS } = await import('@/repositories/demo/seed-ids');
const { demoProfile, setupIsolatedStore, teardownIsolatedStore } = await import('./helpers');

beforeEach(() => {
  setupIsolatedStore();
  currentUser = null;
});
afterEach(() => {
  teardownIsolatedStore();
  currentUser = null;
});

async function signInAs(role: Parameters<typeof demoProfile>[0]): Promise<Profile> {
  currentUser = await demoProfile(role);
  return currentUser;
}

describe('공개 범위에 따른 조회 (요구사항 5번)', () => {
  it('남의 임시저장 도구는 볼 수 없다', async () => {
    const developer = await signInAs('developer');
    const requester = await demoProfile('requester');

    const { toolId } = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '남의 임시저장' },
    });
    const tool = await getRepositories().tools.getTool(toolId);
    expect(tool).not.toBeNull();

    expect(canRead(toActor(developer), tool!)).toBe(true);
    expect(canRead(toActor(requester), tool!)).toBe(false);
  });

  it('검토자와 관리자는 임시저장도 볼 수 있다 — 검토가 업무이기 때문', async () => {
    const developer = await signInAs('developer');
    const reviewer = await demoProfile('reviewer');
    const admin = await demoProfile('admin');

    const { toolId } = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '검토 대상 임시저장' },
    });
    const tool = (await getRepositories().tools.getTool(toolId))!;

    expect(canRead(toActor(reviewer), tool)).toBe(true);
    expect(canRead(toActor(admin), tool)).toBe(true);
  });

  it('볼 수 없는 도구의 상세는 NOT_FOUND 로 막는다', async () => {
    const developer = await signInAs('developer');
    const { toolId } = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '숨겨진 도구' },
    });

    await signInAs('requester');
    // 권한 오류가 아니라 "없음"이어야 한다.
    // "권한이 없습니다"라고 알려 주면 그 도구가 존재한다는 사실이 새어 나간다.
    await expect(loadToolDetail(toolId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('목록에서도 볼 수 없는 도구는 빠진다', async () => {
    const developer = await signInAs('developer');
    await saveDraft(developer, { form: { ...emptyToolForm(), name: '목록에서 숨을 도구' } });

    const asDeveloper = await listTools(parseToolQuery({}));
    const developerNames = asDeveloper.page.items.map((item) => item.tool.name);
    expect(developerNames).toContain('목록에서 숨을 도구');

    await signInAs('requester');
    const asRequester = await listTools(parseToolQuery({}));
    const requesterNames = asRequester.page.items.map((item) => item.tool.name);
    expect(requesterNames).not.toContain('목록에서 숨을 도구');
  });
});

describe('목록 조회', () => {
  it('상태 필터가 적용된다', async () => {
    await signInAs('admin');
    const result = await listTools(parseToolQuery({ status: 'APPROVED' }));

    expect(result.page.items.length).toBeGreaterThan(0);
    expect(result.page.items.every((item) => item.tool.status === 'APPROVED')).toBe(true);
  });

  it('이름순 정렬은 한국어 사전순을 따른다', async () => {
    await signInAs('admin');
    const result = await listTools(parseToolQuery({ sort: 'NAME' }));
    const names = result.page.items.map((item) => item.tool.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')));
  });

  it('평가순 정렬에서 평가 없는 도구는 뒤로 간다', async () => {
    await signInAs('admin');
    const result = await listTools(parseToolQuery({ sort: 'EVALUATION' }));
    const scores = result.page.items.map((item) => item.averageOverallScore);

    const firstNull = scores.indexOf(null);
    if (firstNull >= 0) {
      // null 이 한 번 나오면 그 뒤는 전부 null 이어야 한다.
      expect(scores.slice(firstNull).every((score) => score === null)).toBe(true);
    }
  });

  it('누구나 도구를 등록할 수 있으므로 등록 버튼이 항상 보인다', async () => {
    for (const account of ['requester', 'developer', 'admin'] as const) {
      await signInAs(account);
      expect((await listTools(parseToolQuery({}))).canCreate).toBe(true);
    }
  });
});

describe('상세 조회', () => {
  it('승인된 도구의 상세를 읽을 수 있다', async () => {
    await signInAs('admin');
    const detail = await loadToolDetail(DEMO_TOOL_IDS.excelAggregation);

    expect(detail.tool.status).toBe('APPROVED');
    expect(detail.categoryName).not.toBe('미분류');
    expect(detail.statusHistory.length).toBeGreaterThan(0);
  });

  it('평가가 없으면 평균을 0 이 아니라 null 로 둔다', async () => {
    await signInAs('admin');
    const detail = await loadToolDetail(DEMO_TOOL_IDS.inquiryClassifier);

    expect(detail.evaluationSummary.count).toBe(0);
    expect(detail.evaluationSummary.averageOverall).toBeNull();
  });

  it('평가는 시범운영·정식 승인 상태에서만 가능하다 (요구사항 9번)', async () => {
    await signInAs('admin');

    const approved = await loadToolDetail(DEMO_TOOL_IDS.excelAggregation);
    expect(approved.tool.status).toBe('APPROVED');
    expect(approved.permissions.canEvaluate).toBe(true);

    const draft = await loadToolDetail(DEMO_TOOL_IDS.inquiryClassifier);
    expect(draft.tool.status).toBe('DRAFT');
    expect(draft.permissions.canEvaluate).toBe(false);
  });

  it('없는 도구는 NOT_FOUND 를 던진다', async () => {
    await signInAs('admin');
    await expect(loadToolDetail('00000006-0000-4000-8000-999999999999')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('검색 조건 파싱', () => {
  it('잘못된 값은 기본값으로 되돌린다', () => {
    const query = parseToolQuery({
      status: 'NOT_A_STATUS',
      sort: '헛소리',
      view: 'hologram',
      page: '-5',
    });

    expect(query.statuses).toEqual([]);
    expect(query.sort).toBe('RECENT');
    expect(query.view).toBe('card');
    expect(query.page).toBe(1);
  });

  it('쉼표 구분과 반복 파라미터를 모두 받는다', () => {
    expect(parseToolQuery({ status: 'DRAFT,APPROVED' }).statuses).toEqual(['DRAFT', 'APPROVED']);
    expect(parseToolQuery({ status: ['DRAFT', 'APPROVED'] }).statuses).toEqual([
      'DRAFT',
      'APPROVED',
    ]);
  });

  it('검색어는 100자로 자른다', () => {
    expect(parseToolQuery({ q: 'ㄱ'.repeat(500) }).keyword).toHaveLength(100);
  });

  it('조건을 URL 로 되돌릴 수 있다 — 주소만 공유하면 같은 화면이 된다', () => {
    const query = parseToolQuery({ status: 'APPROVED', classification: 'PERSONAL', sort: 'NAME' });
    const href = buildToolHref(query);

    const restored = parseToolQuery(
      Object.fromEntries(new URL(`http://x${href}`).searchParams.entries()),
    );
    expect(restored.statuses).toEqual(query.statuses);
    expect(restored.classifications).toEqual(query.classifications);
    expect(restored.sort).toBe(query.sort);
  });

  it('조건이 없으면 깨끗한 주소를 만든다', () => {
    expect(buildToolHref(parseToolQuery({}))).toBe('/tools');
  });

  it('페이지를 넘겨도 조건이 유지된다', () => {
    const query = parseToolQuery({ q: '챗봇', status: 'APPROVED' });
    const href = buildToolHref(query, { page: 3 });

    expect(href).toContain('page=3');
    expect(href).toContain('q=%EC%B1%97%EB%B4%87');
    expect(href).toContain('status=APPROVED');
  });
});
