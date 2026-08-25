import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 배지.
 *
 * 요구사항 12번: 상태는 **텍스트 + 아이콘 + 색** 3중으로 인코딩한다.
 * 색각 이상이 있거나 흑백으로 인쇄해도 의미가 전달되어야 하므로,
 * 아이콘 없이 색만으로 구분되는 배지를 만들지 않는다.
 */

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5',
  {
    variants: {
      tone: {
        neutral: 'border-border-strong bg-neutral-soft text-fg-muted',
        primary: 'border-primary/25 bg-primary-soft text-primary',
        success: 'border-success/25 bg-success-soft text-success',
        warning: 'border-warning/30 bg-warning-soft text-warning',
        danger: 'border-danger/25 bg-danger-soft text-danger',
        info: 'border-info/25 bg-info-soft text-info',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: LucideIcon;
}

export function Badge({ className, tone, icon: Icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
