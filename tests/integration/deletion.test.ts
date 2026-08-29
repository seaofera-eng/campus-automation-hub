import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteDemand } from '@/application/demands/delete';
import { deleteTool } from '@/application/tools/delete';
import { DomainError } from '@/domain/shared/errors';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { getRepositories } from '@/lib/di/container';
import { DEMO_DEMAND_IDS, DEMO_TOOL_IDS } from '@/repositories/demo/seed-ids';
import {
  DEMO_CAMPUS_ID,
  demoProfile,
  setupIsolatedStore,
  teardownIsolatedStore,
} from './helpers';

/**
 * 내가 올린 것 지우기 (리뷰 2026-08-30).
 *
 * "자기가 올린 수요나 도구를 삭제할 수 있는 기능을 넣을 수 없을까?"
 *
 * 확인할 것이 셋이다.
 *
 * 1. **자격** — 남의 것은 못 지운다.
 * 2. **상태** — 자기 것이라도 검토가 시작됐으면 못 지운다.
 * 3. **결과** — 지우면 목록에서 사라지되 줄은 남는다.
 *
 * 서버 액션이 아니라 application 서비스를 직접 부른다. 서버 액션은
 * `next/headers` 에 의존해 이 환경에서 돌지 않는다.
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

async function statusOf(toolId: string) {
  const tool = await getRepositories().tools.getTool(toolId as never);
  return tool?.status ?? null;
}

/**
 * 목록에 보이는 도구 ID.
 *
 * application 의 `listTools` 대신 저장소를 직접 부른다. 그쪽은 세션을 요구하는데,
 * 여기서 확인하려는 것은 **삭제 표시가 목록에서 걸러지는가**이고 그 판단은
 * 저장소에 있다.
 */
async function visibleToolIds(): Promise<string[]> {
  const page = await getRepositories().tools.listTools({ campusId: DEMO_CAMPUS_ID }, 'RECENT', {
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });
  return page.items.map((tool) => tool.id as string);
}

async function visibleDemandIds(): Promise<string[]> {
  const page = await getRepositories().demands.listDemands(
    { campusId: DEMO_CAMPUS_ID },
    { page: 1, pageSize: MAX_PAGE_SIZE },
  );
  return page.items.map((demand) => demand.id as string);
}

describe('도구 삭제', () => {
  it('임시저장 도구는 만든 사람이 지울 수 있다', async () => {
    const developer = await demoProfile('developer');
    const toolId = DEMO_TOOL_IDS.inquiryClassifier as string;
    expect(await statusOf(toolId)).toBe('DRAFT');

    await deleteTool(developer, toolId);

    // 줄은 남는다. 평가·이력이 이 도구를 가리키고 있기 때문이다.
    const raw = await getRepositories().tools.getTool(toolId as never);
    expect(raw).not.toBeNull();
    expect(raw?.deletedAt).not.toBeNull();
  });

  it('지운 도구는 목록에서 사라진다', async () => {
    const developer = await demoProfile('developer');
    const toolId = DEMO_TOOL_IDS.inquiryClassifier as string;

    expect(await visibleToolIds()).toContain(toolId);
    await deleteTool(developer, toolId);
    expect(await visibleToolIds()).not.toContain(toolId);
  });

  it('남이 만든 도구는 지울 수 없다', async () => {
    const other = await demoProfile('requester');

    await expect(deleteTool(other, DEMO_TOOL_IDS.inquiryClassifier as string)).rejects.toThrow(
      DomainError,
    );
  });

  it('검토가 시작된 도구는 만든 사람도 지울 수 없다', async () => {
    const developer = await demoProfile('developer');
    const toolId = DEMO_TOOL_IDS.meetingNotes as string;

    const repositories = getRepositories();
    const tool = await repositories.tools.getTool(toolId as never);
    await repositories.tools.updateTool({ ...tool!, status: 'HUMAN_REVIEW' });

    // 검토자가 읽고 있는 것이 발밑에서 사라지면 안 된다.
    await expect(deleteTool(developer, toolId)).rejects.toThrow(/검토가 진행 중/);
  });

  it('승인된 도구는 만든 사람이 지울 수 없고, 폐기를 요청하라고 알린다', async () => {
    const developer = await demoProfile('developer');
    const toolId = DEMO_TOOL_IDS.meetingNotes as string;

    const repositories = getRepositories();
    const tool = await repositories.tools.getTool(toolId as never);
    await repositories.tools.updateTool({ ...tool!, status: 'APPROVED' });

    await expect(deleteTool(developer, toolId)).rejects.toThrow(/폐기를 요청/);
  });

  it('도구 관리 권한자는 상태와 무관하게 지울 수 있다', async () => {
    const admin = await demoProfile('admin');
    const toolId = DEMO_TOOL_IDS.meetingNotes as string;

    const repositories = getRepositories();
    const tool = await repositories.tools.getTool(toolId as never);
    await repositories.tools.updateTool({ ...tool!, status: 'APPROVED' });

    // 잘못 올라온 것을 치우는 것은 운영의 일이다.
    await expect(deleteTool(admin, toolId)).resolves.toBeUndefined();
  });

  it('검토 권한만 있는 사람은 남의 도구를 지울 수 없다', async () => {
    // 검토는 상태를 바꾸는 일이지 치우는 일이 아니다.
    const reviewer = await demoProfile('reviewer');

    await expect(deleteTool(reviewer, DEMO_TOOL_IDS.inquiryClassifier as string)).rejects.toThrow(
      DomainError,
    );
  });

  it('이미 지운 도구는 다시 지울 수 없다', async () => {
    const developer = await demoProfile('developer');
    const toolId = DEMO_TOOL_IDS.inquiryClassifier as string;

    await deleteTool(developer, toolId);
    await expect(deleteTool(developer, toolId)).rejects.toThrow(DomainError);
  });
});

describe('수요 삭제', () => {
  it('공개 상태의 수요는 올린 사람이 지울 수 있고 목록에서 사라진다', async () => {
    const requester = await demoProfile('requester');
    const demandId = DEMO_DEMAND_IDS.departmentReports as string;

    expect(await visibleDemandIds()).toContain(demandId);
    await deleteDemand(requester, demandId);
    expect(await visibleDemandIds()).not.toContain(demandId);
  });

  it('남이 올린 수요는 지울 수 없다', async () => {
    const other = await demoProfile('developer');

    await expect(
      deleteDemand(other, DEMO_DEMAND_IDS.departmentReports as string),
    ).rejects.toThrow(DomainError);
  });

  it('누군가 맡아 진행 중인 수요는 지울 수 없고, 먼저 종료하라고 알린다', async () => {
    const requester = await demoProfile('requester');
    const demandId = DEMO_DEMAND_IDS.departmentReports as string;

    const repositories = getRepositories();
    const demand = await repositories.demands.getDemand(demandId as never);
    await repositories.demands.updateDemand({ ...demand!, status: 'IN_DEVELOPMENT' });

    await expect(deleteDemand(requester, demandId)).rejects.toThrow(/수요 종료/);
  });

  it('해결이 끝난 수요도 바로 지울 수 없다', async () => {
    const requester = await demoProfile('requester');
    const demandId = DEMO_DEMAND_IDS.departmentReports as string;

    const repositories = getRepositories();
    const demand = await repositories.demands.getDemand(demandId as never);
    await repositories.demands.updateDemand({ ...demand!, status: 'COMPLETED' });

    // 토큰 지급 기록이 걸려 있다.
    await expect(deleteDemand(requester, demandId)).rejects.toThrow(DomainError);
  });
});
