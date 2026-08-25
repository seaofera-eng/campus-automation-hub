import 'server-only';
import type { CampusId, NotificationId, UserId } from '@/domain/shared/ids';
import { newId } from '@/domain/shared/ids';
import type { NotificationKind } from '@/domain/observability/types';
import { getRepositories } from '@/lib/di/container';

/**
 * 알림.
 *
 * 본문에 개인정보나 상담 내용 같은 민감한 값을 담지 않는다. 알림은 목록에
 * 그대로 노출되고 오래 남는다. "무엇이 일어났는지"와 "어디로 가면 되는지"만 적고,
 * 자세한 내용은 링크를 따라가서 보게 한다.
 *
 * 알림 실패가 본 작업을 되돌리지 않는다.
 */

export interface NotifyInput {
  campusId: CampusId;
  recipientUserId: UserId;
  kind: NotificationKind;
  title: string;
  body: string;
  linkPath: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await getRepositories().observability.insertNotification({
      id: newId<NotificationId>(),
      campusId: input.campusId,
      recipientUserId: input.recipientUserId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      linkPath: input.linkPath,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[notify] 알림 생성 실패:', input.kind, error);
  }
}

/** 여러 명에게 같은 알림을 보낸다. 중복 수신자는 한 번만 받는다. */
export async function notifyMany(
  recipients: readonly UserId[],
  input: Omit<NotifyInput, 'recipientUserId'>,
): Promise<void> {
  const unique = [...new Set(recipients)];
  await Promise.all(unique.map((recipientUserId) => notify({ ...input, recipientUserId })));
}
