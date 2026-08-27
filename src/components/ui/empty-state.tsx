import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 빈 상태.
 *
 * 요구사항 12번: 비어 있다는 사실만 알리지 않고 **다음에 무엇을 하면 되는지**
 * 알려 준다. 그래서 `action` 을 선택 항목이 아니라 기본으로 넣도록 설계했다.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 다음 행동으로 이어지는 버튼/링크 */
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong',
        'bg-surface px-6 py-14 text-center',
        className,
      )}
      {...props}
    >
      {/* 아이콘을 옅은 원 안에 넣어 '비어 있음'이 사고처럼 보이지 않게 한다 */}
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
        <Icon className="size-6 text-fg-subtle" aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-semibold text-fg">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-fg-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
