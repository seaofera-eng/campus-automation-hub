import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

const alertVariants = cva('flex gap-3 rounded-card border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-info/25 bg-info-soft text-fg',
      success: 'border-success/25 bg-success-soft text-fg',
      warning: 'border-warning/30 bg-warning-soft text-fg',
      danger: 'border-danger/25 bg-danger-soft text-fg',
    },
  },
  defaultVariants: { tone: 'info' },
});

type AlertTone = NonNullable<VariantProps<typeof alertVariants>['tone']>;

const TONE_ICONS: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  danger: CircleAlert,
};

const TONE_ICON_COLORS: Record<AlertTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
}

export function Alert({ className, tone = 'info', title, children, ...props }: AlertProps) {
  const Icon = TONE_ICONS[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'note'}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', TONE_ICON_COLORS[tone])} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold text-fg">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-1', 'text-fg-muted')}>{children}</div> : null}
      </div>
    </div>
  );
}
