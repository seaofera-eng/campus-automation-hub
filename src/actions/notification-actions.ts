'use server';

import { revalidatePath } from 'next/cache';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/application/shared/notifications';
import { run, type ActionResult } from '@/lib/actions/result';
import { parseOrThrow } from '@/lib/validation/common';
import { markNotificationReadSchema } from '@/lib/validation/notification';

/**
 * 알림 읽음 처리 (리뷰 2026-08-28 5절).
 *
 * ## 감사 로그를 남기지 않는다
 *
 * 읽었다는 사실은 상태 변경이 아니다. 알림은 하루에도 여러 건 쌓이므로,
 * 여기서 로그를 남기면 정작 봐야 할 등록·승인 기록이 묻힌다.
 *
 * ## 실패해도 화면은 넘어간다
 *
 * 부르는 쪽이 결과를 기다리지 않는다. 읽음 표시를 못 남겼다고 사용자가
 * 알림을 못 열게 되어서는 안 된다.
 */
export async function markNotificationReadAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const data = parseOrThrow(markNotificationReadSchema, input);
    await markNotificationRead(data.notificationId);
    revalidatePath('/', 'layout');
    return null;
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  return run(async () => {
    await markAllNotificationsRead();
    revalidatePath('/', 'layout');
    return null;
  });
}
