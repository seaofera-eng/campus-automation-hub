import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import type { Notice } from '@/domain/notice/types';
import { notFound } from '@/domain/shared/errors';
import { newId } from '@/domain/shared/ids';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 공지 (리뷰 1절).
 *
 * 내린 공지는 지우지 않고 감춘다. 무엇을 공지했는지는 나중에 확인할 수 있어야 한다.
 */

export interface NoticeListResult {
  actor: Profile;
  notices: (Notice & { authorName: string })[];
  canManage: boolean;
}

export async function listNotices(): Promise<NoticeListResult> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const canManage = (() => {
    try {
      assertCan(toActor(actor), 'admin:notices');
      return true;
    } catch {
      return false;
    }
  })();

  // 관리 권한이 있으면 내린 공지도 함께 본다. 없으면 올라온 것만.
  const [notices, profiles] = await Promise.all([
    repositories.notices.list(actor.campusId, canManage),
    repositories.identity.listProfiles(actor.campusId),
  ]);

  const names = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return {
    actor,
    notices: notices.map((notice) => ({
      ...notice,
      authorName: names.get(notice.authorUserId) ?? '알 수 없음',
    })),
    canManage,
  };
}

export interface SaveNoticeInput {
  noticeId: string;
  title: string;
  body: string;
  pinned: boolean;
  isPublished: boolean;
}

export async function saveNotice(actor: Profile, input: SaveNoticeInput): Promise<Notice> {
  assertCan(toActor(actor), 'admin:notices');

  const repositories = getRepositories();
  const now = new Date().toISOString();

  if (input.noticeId) {
    const existing = await repositories.notices.get(input.noticeId);
    if (!existing) throw notFound('공지');

    return repositories.notices.upsert({
      ...existing,
      title: input.title,
      body: input.body,
      pinned: input.pinned,
      isPublished: input.isPublished,
      updatedAt: now,
    });
  }

  return repositories.notices.upsert({
    id: newId<string>(),
    campusId: actor.campusId,
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    isPublished: input.isPublished,
    authorUserId: actor.id,
    createdAt: now,
    updatedAt: now,
  });
}
