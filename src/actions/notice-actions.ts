'use server';

import { revalidatePath } from 'next/cache';
import { saveNotice } from '@/application/notices/manage';
import { withAudit } from '@/application/shared/audit';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import { parseOrThrow } from '@/lib/validation/common';
import { saveNoticeSchema } from '@/lib/validation/notice';

/**
 * 공지 저장.
 *
 * 공지는 모두가 보는 글이라 누가 무엇을 올렸는지 감사 로그에 남긴다.
 * 다만 본문은 남기지 않는다 — 바뀐 필드 이름만 기록한다.
 */
export async function saveNoticeAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(saveNoticeSchema, input);

    await withAudit(
      actor,
      {
        action: data.noticeId ? 'notice.update' : 'notice.create',
        targetType: 'notice',
        targetId: data.noticeId || null,
        changedFields: ['title', 'body', 'pinned', 'isPublished'],
        summary: data.isPublished ? '공지를 올렸습니다.' : '공지를 내렸습니다.',
      },
      () => saveNotice(actor, data),
    );

    revalidatePath('/notices');
    revalidatePath('/home');
    return null;
  });
}
