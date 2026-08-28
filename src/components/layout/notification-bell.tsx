'use client';

import { Popover } from 'radix-ui';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/actions/notification-actions';
import type { Notification } from '@/domain/observability/types';

/**
 * 알림 종 (리뷰 2026-08-28 5절 반영).
 *
 * "알림은 뜨는데 알림을 눌렀을 때 해당 상세 페이지로 이동했으면 좋겠음"
 *
 * 링크는 처음부터 맞게 걸려 있었다. 문제는 두 가지였다.
 *
 * 1. **읽음 표시가 그대로 남았다.** 저장소에 읽음 처리 메서드가 있는데
 *    아무도 부르지 않았다. 눌러도 파란 점이 그대로니 "안 눌린다"로 보인다.
 * 2. **팝오버가 안 닫혔다.** 뒤에서 화면은 바뀌는데 목록이 덮고 있으니
 *    이동한 것이 보이지 않았다.
 *
 * 읽음 처리는 이동을 막지 않는다. 실패해도 링크는 그대로 따라간다 —
 * 알림을 여는 일과 읽음 표시를 남기는 일은 별개다.
 */
export function NotificationBell({ notifications }: { notifications: readonly Notification[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const unreadCount = notifications.filter((item) => item.readAt === null).length;

  function readAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="relative rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
        aria-label={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : '알림'}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-card border border-border bg-surface shadow-floating"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold text-fg">알림</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={readAll}
                disabled={pending}
                className="flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                모두 읽음
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-muted">새로운 알림이 없습니다.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.linkPath}
                    onClick={() => {
                      // 목록을 덮은 채로 두면 화면이 바뀌어도 보이지 않는다.
                      setOpen(false);
                      if (notification.readAt !== null) return;
                      // 읽음 표시가 실패해도 이동은 막지 않는다.
                      void markNotificationReadAction({
                        notificationId: notification.id,
                      }).catch(() => {
                        /* 조용히 넘긴다 */
                      });
                    }}
                    className="block px-4 py-3 transition-colors hover:bg-surface-muted"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-fg">
                      {notification.readAt === null ? (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-primary"
                          aria-label="읽지 않음"
                        />
                      ) : null}
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">{notification.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
