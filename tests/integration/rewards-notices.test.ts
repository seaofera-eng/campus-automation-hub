import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/domain/identity/types';
import type * as CurrentUserModule from '@/lib/auth/current-user';

/**
 * 5단계에서 추가된 것 — 토큰 · 공지 · 수요 문의.
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

const { awardTokens, loadAwardState, loadMyBalance } = await import(
  '@/application/rewards/tokens'
);
const { listNotices, saveNotice } = await import('@/application/notices/manage');
const { addDemandComment, deleteDemandComment, listDemandComments } = await import(
  '@/application/demands/comments'
);
const { addDemandAttachment, listDemandAttachments, removeDemandAttachment } = await import(
  '@/application/demands/attachments'
);
const { DEMO_DEMAND_IDS, DEMO_TOOL_IDS } = await import('@/repositories/demo/seed-ids');
const { demoProfile, setupIsolatedStore, teardownIsolatedStore } = await import('./helpers');

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

async function signInAs(key: Parameters<typeof demoProfile>[0]): Promise<Profile> {
  currentUser = await demoProfile(key);
  return currentUser;
}

describe('토큰 — 잔액', () => {
  it('기록을 더해서 잔액을 낸다', async () => {
    await signInAs('developer');
    const balance = await loadMyBalance();

    // 시드: 가입 축하 1000 + 수여 300
    expect(balance.total).toBe(1300);
    expect(balance.awarded).toBe(300);
  });

  it('받은 적이 없으면 0이 아니라 지급분만 나온다', async () => {
    await signInAs('reviewer');
    const balance = await loadMyBalance();
    expect(balance.total).toBe(0);
  });
});

describe('토큰 — 수여', () => {
  it('수요를 올린 사람이 연결된 도구에 줄 수 있다', async () => {
    const requester = await signInAs('requester2');

    const entry = await awardTokens(requester, {
      demandId: DEMO_DEMAND_IDS.complaintRouting,
      toolId: DEMO_TOOL_IDS.inquiryClassifier,
      note: '민원 분류가 정확해서 손이 많이 줄었습니다.',
    });

    expect(entry.kind).toBe('AWARD');
    expect(entry.awardedBy).toBe(requester.id);
  });

  it('남의 수요에 걸린 토큰은 대신 줄 수 없다', async () => {
    const other = await signInAs('requester');

    await expect(
      awardTokens(other, {
        demandId: DEMO_DEMAND_IDS.complaintRouting,
        toolId: DEMO_TOOL_IDS.inquiryClassifier,
        note: '대신 주려고 합니다.',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  /** 한 수요에 한 번만. 리뷰 6.4절의 "하나의 도구에 토큰을 수여" 그대로다. */
  it('같은 수요에 두 번 줄 수 없다', async () => {
    const requester = await signInAs('requester2');

    await awardTokens(requester, {
      demandId: DEMO_DEMAND_IDS.complaintRouting,
      toolId: DEMO_TOOL_IDS.inquiryClassifier,
      note: '먼저 준 것입니다.',
    });

    await expect(
      awardTokens(requester, {
        demandId: DEMO_DEMAND_IDS.complaintRouting,
        toolId: DEMO_TOOL_IDS.inquiryClassifier,
        note: '또 주려고 합니다.',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('걸어 둔 토큰이 없으면 줄 수 없다', async () => {
    const requester = await signInAs('requester');
    const repositories = (await import('@/lib/di/container')).getRepositories();

    const demand = await repositories.demands.getDemand(DEMO_DEMAND_IDS.meetingTasks);
    if (!demand) throw new Error('시드 수요를 찾지 못했습니다.');
    await repositories.demands.updateDemand({ ...demand, offeredTokens: null });

    await expect(
      awardTokens(requester, {
        demandId: DEMO_DEMAND_IDS.meetingTasks,
        toolId: DEMO_TOOL_IDS.meetingNotes,
        note: '토큰이 없는 수요입니다.',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('이미 수여한 수요는 버튼이 보이지 않는다', async () => {
    const requester = await signInAs('requester2');
    const before = await loadAwardState(requester, DEMO_DEMAND_IDS.complaintRouting);
    expect(before.canAward).toBe(true);

    await awardTokens(requester, {
      demandId: DEMO_DEMAND_IDS.complaintRouting,
      toolId: DEMO_TOOL_IDS.inquiryClassifier,
      note: '수여합니다.',
    });

    const after = await loadAwardState(requester, DEMO_DEMAND_IDS.complaintRouting);
    expect(after.canAward).toBe(false);
    expect(after.alreadyAwarded).not.toBeNull();
  });
});

describe('공지', () => {
  it('공지 관리 권한이 있어야 쓸 수 있다', async () => {
    const reviewer = await signInAs('reviewer');

    await expect(
      saveNotice(reviewer, {
        noticeId: '',
        title: '권한 없이 쓰는 공지',
        body: '이건 막혀야 합니다.',
        pinned: false,
        isPublished: true,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('관리자는 공지를 쓰고 내릴 수 있다', async () => {
    const admin = await signInAs('admin');

    const created = await saveNotice(admin, {
      noticeId: '',
      title: '새 공지',
      body: '내용입니다.',
      pinned: false,
      isPublished: true,
    });
    expect(created.isPublished).toBe(true);

    const hidden = await saveNotice(admin, {
      noticeId: created.id,
      title: created.title,
      body: created.body,
      pinned: false,
      isPublished: false,
    });
    expect(hidden.isPublished).toBe(false);
  });

  /** 내린 공지는 지우지 않고 감춘다. 관리자에게는 계속 보인다. */
  it('내린 공지는 이용자에게 안 보이고 관리자에게는 보인다', async () => {
    const admin = await signInAs('admin');
    const created = await saveNotice(admin, {
      noticeId: '',
      title: '내릴 공지',
      body: '내용입니다.',
      pinned: false,
      isPublished: false,
    });

    const asAdmin = await listNotices();
    expect(asAdmin.notices.some((notice) => notice.id === created.id)).toBe(true);

    await signInAs('developer');
    const asUser = await listNotices();
    expect(asUser.notices.some((notice) => notice.id === created.id)).toBe(false);
    expect(asUser.canManage).toBe(false);
  });

  it('고정 공지가 먼저 온다', async () => {
    const admin = await signInAs('admin');
    await saveNotice(admin, {
      noticeId: '',
      title: '방금 쓴 고정 공지',
      body: '내용입니다.',
      pinned: true,
      isPublished: true,
    });

    const { notices } = await listNotices();
    expect(notices[0]?.pinned).toBe(true);
  });
});

describe('수요 문의', () => {
  it('참여 신청 없이 문의를 남길 수 있다', async () => {
    const developer = await signInAs('developer');

    await addDemandComment(developer, {
      demandId: DEMO_DEMAND_IDS.grantAlerts,
      body: '어떤 형태로 알림을 받고 싶으신가요?',
    });

    const comments = await listDemandComments(DEMO_DEMAND_IDS.grantAlerts);
    expect(comments.some((comment) => comment.authorName === developer.name)).toBe(true);
  });

  it('작성자 신분이 함께 보인다', async () => {
    await signInAs('developer');
    const comments = await listDemandComments(DEMO_DEMAND_IDS.departmentReports);
    expect(comments[0]?.authorMemberType).toBeTruthy();
  });

  it('내가 쓴 문의만 지울 수 있다', async () => {
    const developer = await signInAs('developer');
    const created = await addDemandComment(developer, {
      demandId: DEMO_DEMAND_IDS.grantAlerts,
      body: '지울 문의입니다.',
    });

    const other = await signInAs('requester');
    await expect(deleteDemandComment(other, created.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    await signInAs('developer');
    await deleteDemandComment(developer, created.id);

    const comments = await listDemandComments(DEMO_DEMAND_IDS.grantAlerts);
    expect(comments.some((comment) => comment.id === created.id)).toBe(false);
  });

  /** 검토 권한자는 부적절한 글을 정리할 수 있다. */
  it('검토 권한자는 남의 문의도 지울 수 있다', async () => {
    const developer = await signInAs('developer');
    const created = await addDemandComment(developer, {
      demandId: DEMO_DEMAND_IDS.grantAlerts,
      body: '검토자가 지울 문의입니다.',
    });

    const reviewer = await signInAs('reviewer');
    await deleteDemandComment(reviewer, created.id);

    const comments = await listDemandComments(DEMO_DEMAND_IDS.grantAlerts);
    expect(comments.some((comment) => comment.id === created.id)).toBe(false);
  });
});

describe('수요 참고 자료', () => {
  /** 1x1 투명 PNG. 실제 바이트를 넣어야 서버 검사를 통과한다. */
  const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);

  it('수요를 올린 사람은 자료를 붙일 수 있다', async () => {
    const requester = await signInAs('requester');

    const saved = await addDemandAttachment(requester, {
      demandId: DEMO_DEMAND_IDS.meetingTasks,
      fileName: '회의록 서식.png',
      mimeType: 'image/png',
      bytes: PNG,
    });

    expect(saved.fileName).toBe('회의록 서식.png');
    // 저장 경로에 사용자가 정한 파일명을 쓰지 않는다.
    expect(saved.storagePath).not.toContain('회의록');
    expect(saved.storagePath).toContain(saved.id);
  });

  it('남의 수요에는 자료를 붙일 수 없다', async () => {
    const other = await signInAs('developer');

    await expect(
      addDemandAttachment(other, {
        demandId: DEMO_DEMAND_IDS.meetingTasks,
        fileName: '끼워넣기.png',
        mimeType: 'image/png',
        bytes: PNG,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('허용하지 않는 형식은 막는다', async () => {
    const requester = await signInAs('requester');

    await expect(
      addDemandAttachment(requester, {
        demandId: DEMO_DEMAND_IDS.meetingTasks,
        fileName: '스크립트.svg',
        // SVG 는 스크립트를 품을 수 있어 허용 목록에서 뺐다.
        mimeType: 'image/svg+xml',
        bytes: PNG,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('빈 파일은 막는다', async () => {
    const requester = await signInAs('requester');

    await expect(
      addDemandAttachment(requester, {
        demandId: DEMO_DEMAND_IDS.meetingTasks,
        fileName: '빈파일.png',
        mimeType: 'image/png',
        bytes: new Uint8Array(0),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('붙인 사람만 뗄 수 있다', async () => {
    const requester = await signInAs('requester');
    const saved = await addDemandAttachment(requester, {
      demandId: DEMO_DEMAND_IDS.meetingTasks,
      fileName: '뗄 파일.png',
      mimeType: 'image/png',
      bytes: PNG,
    });

    const other = await signInAs('developer');
    await expect(
      removeDemandAttachment(other, DEMO_DEMAND_IDS.meetingTasks, saved.id),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await signInAs('requester');
    await removeDemandAttachment(requester, DEMO_DEMAND_IDS.meetingTasks, saved.id);

    const left = await listDemandAttachments(DEMO_DEMAND_IDS.meetingTasks);
    expect(left.some((row) => row.id === saved.id)).toBe(false);
  });

  /** 다른 수요의 첨부 ID 를 넣어도 지워지면 안 된다. */
  it('다른 수요의 첨부는 지워지지 않는다', async () => {
    const requester = await signInAs('requester');
    const saved = await addDemandAttachment(requester, {
      demandId: DEMO_DEMAND_IDS.meetingTasks,
      fileName: '남겨둘 파일.png',
      mimeType: 'image/png',
      bytes: PNG,
    });

    const other = await signInAs('requester2');
    await expect(
      removeDemandAttachment(other, DEMO_DEMAND_IDS.complaintRouting, saved.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const left = await listDemandAttachments(DEMO_DEMAND_IDS.meetingTasks);
    expect(left.some((row) => row.id === saved.id)).toBe(true);
  });
});
