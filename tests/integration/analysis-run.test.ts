import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runToolAnalysis } from '@/application/analysis/run';
import { DomainError } from '@/domain/shared/errors';
import { DEMO_TOOL_IDS } from '@/repositories/demo/seed-ids';
import { demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 화면에서 AI 분석 돌리기 — 문지기만 확인한다 (리뷰 2026-08-30).
 *
 * "그냥 허용하면 API 토큰이 낭비될 것 같으니까 간단한 비밀코드를 입력하게"
 *
 * **모델을 실제로 부르는 경로는 여기서 시험하지 않는다.** 시험이 돌 때마다
 * 돈이 나가면 안 되기 때문이다. 확인하는 것은 그 앞의 문이다 —
 * 권한이 없으면, 코드가 틀리면, 코드를 정해 두지 않았으면 **모델에 닿기 전에**
 * 막히는가.
 *
 * 문이 열린 뒤의 동작(중복·위험도·품질검증 호출과 저장)은 `pnpm ai:analyze`
 * 가 쓰는 것과 같은 함수라 이미 실제로 47회 돌려 확인했다.
 */

const REAL_CODE = 'test-run-code-1234';

beforeEach(() => {
  setupIsolatedStore();
  vi.stubEnv('AI_RUN_CODE', REAL_CODE);
});

afterEach(() => {
  vi.unstubAllEnvs();
  teardownIsolatedStore();
});

describe('AI 분석 실행 문지기', () => {
  it('검토 권한이 없으면 코드가 맞아도 막힌다', async () => {
    const developer = await demoProfile('developer');

    await expect(
      runToolAnalysis(developer, {
        toolId: DEMO_TOOL_IDS.meetingNotes as string,
        accessCode: REAL_CODE,
      }),
    ).rejects.toThrow(DomainError);
  });

  it('실행 코드가 틀리면 막힌다', async () => {
    const reviewer = await demoProfile('reviewer');

    await expect(
      runToolAnalysis(reviewer, {
        toolId: DEMO_TOOL_IDS.meetingNotes as string,
        accessCode: 'wrong-code',
      }),
    ).rejects.toThrow(/실행 코드가 맞지 않습니다/);
  });

  it('코드 길이가 달라도 막힌다', async () => {
    // 길이 비교에서 예외가 나면 안 된다. 짧은 입력도 조용히 실패해야 한다.
    const reviewer = await demoProfile('reviewer');

    await expect(
      runToolAnalysis(reviewer, {
        toolId: DEMO_TOOL_IDS.meetingNotes as string,
        accessCode: 'x',
      }),
    ).rejects.toThrow(/실행 코드가 맞지 않습니다/);
  });

  it('서버에 실행 코드를 정해 두지 않았으면 기능 자체가 꺼진다', async () => {
    vi.stubEnv('AI_RUN_CODE', '');
    const reviewer = await demoProfile('reviewer');

    await expect(
      runToolAnalysis(reviewer, {
        toolId: DEMO_TOOL_IDS.meetingNotes as string,
        accessCode: REAL_CODE,
      }),
    ).rejects.toThrow(/실행 코드\(AI_RUN_CODE\)가 정해져 있지 않습니다/);
  });

  it('없는 도구는 코드가 맞아도 막힌다', async () => {
    const reviewer = await demoProfile('reviewer');

    await expect(
      runToolAnalysis(reviewer, {
        toolId: '00000000-0000-4000-8000-000000000000',
        accessCode: REAL_CODE,
      }),
    ).rejects.toThrow(DomainError);
  });

  it('권한 검사가 코드 검사보다 먼저다', async () => {
    // 권한이 없는 사람에게 "코드가 틀렸다"고 알려 주면, 코드가 있는지 없는지를
    // 흘리게 된다. 자격이 없으면 코드를 보기 전에 끝나야 한다.
    const requester = await demoProfile('requester');

    await expect(
      runToolAnalysis(requester, {
        toolId: DEMO_TOOL_IDS.meetingNotes as string,
        accessCode: 'wrong-code',
      }),
    ).rejects.toThrow(/권한이 없습니다/);
  });
});
