import 'server-only';
import { forbidden, notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 알림 읽음 처리 (리뷰 2026-08-28 5절).
 *
 * "알림은 뜨는데 알림을 눌렀을 때 해당 상세 페이지로 이동했으면 좋겠음"
 *
 * 링크는 처음부터 맞게 걸려 있었다. 문제는 눌러도 **읽지 않음 표시가 그대로
 * 남는 것**이었다 — 저장소에는 읽음 처리 메서드가 있는데 아무도 부르지
 * 않고 있었다. 그러니 눌러도 아무 일이 안 일어난 것처럼 보였다.
 */

/** 알림 하나를 읽음으로 표시한다. */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const actor = await requireUser();
  const repositories = getRepositories();

  // 남의 알림을 읽음 처리할 수 없다. 알림 목록은 사용자별이라 여기서 확인한다.
  const mine = await repositories.observability.listNotifications(actor.id, false);
  const target = mine.find((notification) => notification.id === notificationId);
  if (!target) throw notFound('알림');

  if (target.readAt !== null) return;
  await repositories.observability.markNotificationRead(notificationId, new Date().toISOString());
}

/** 내 알림을 전부 읽음으로 표시한다. */
export async function markAllNotificationsRead(): Promise<void> {
  const actor = await requireUser();
  await getRepositories().observability.markAllNotificationsRead(
    asId(actor.id as string),
    new Date().toISOString(),
  );
}

/**
 * 알림이 가리키는 곳으로 갈 수 있는지 확인하고 주소를 돌려준다.
 *
 * 저장된 `linkPath` 를 그대로 믿지 않는다 — 알림이 만들어진 뒤에 도구가
 * 지워졌을 수 있다. 그런 알림을 누르면 404 로 떨어지는데, 사용자에게는
 * "알림이 고장 났다"로 보인다.
 */
export async function resolveNotificationLink(notificationId: string): Promise<string> {
  const actor = await requireUser();
  const mine = await getRepositories().observability.listNotifications(actor.id, false);
  const target = mine.find((notification) => notification.id === notificationId);
  if (!target) throw forbidden('내 알림이 아닙니다.');
  return target.linkPath;
}
