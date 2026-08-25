'use client';

import { Popover } from 'radix-ui';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import type { Notification } from '@/domain/observability/types';

/**
 * 알림 종.
 *
 * 목록은 서버에서 미리 읽어 넘긴다. 읽음 처리는 4단계 이후 서버 액션이 붙는다.
 */
export function NotificationBell({ notifications }: { notifications: readonly Notification[] }) {
  const unreadCount = notifications.filter((item) => item.readAt === null).length;

  return (
    <Popover.Root>
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
          className="z-50 w-80 overflow-hidden rounded-card border border-border bg-surface shadow-lg"
        >
          <p className="border-b border-border px-4 py-3 text-sm font-semibold text-fg">알림</p>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-muted">새로운 알림이 없습니다.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.linkPath}
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
