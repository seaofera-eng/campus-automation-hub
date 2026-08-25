import { LogOut } from 'lucide-react';
import type { Notification } from '@/domain/observability/types';
import type { Profile } from '@/domain/identity/types';
import { signOutAction } from '@/actions/auth-actions';
import { RoleBadge } from './role-badge';
import { NotificationBell } from './notification-bell';

export interface TopbarProps {
  profile: Profile;
  departmentName: string | null;
  notifications: readonly Notification[];
}

export function Topbar({ profile, departmentName, notifications }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg">
          {profile.name}
          {departmentName ? (
            <span className="ml-2 font-normal text-fg-muted">{departmentName}</span>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <RoleBadge role={profile.role} />
        {profile.isDemoAccount ? (
          // 요구사항 18번: 데모 계정과 운영 계정을 구분해 표시한다.
          <span className="rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
            데모 계정
          </span>
        ) : null}

        <NotificationBell notifications={notifications} />

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <LogOut className="size-4" aria-hidden="true" />
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
