import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  /** 이 숫자가 무엇을 뜻하는지 한 줄 설명 */
  hint?: string;
  href?: string;
  /** 지금 이 사용자가 특히 봐야 할 지표면 강조한다 */
  emphasis?: boolean;
}

export function StatCard({ label, value, icon: Icon, hint, href, emphasis }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <Icon
          className={cn('size-4.5 shrink-0', emphasis ? 'text-primary' : 'text-fg-subtle')}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-fg">{value.toLocaleString('ko-KR')}</p>
      {hint ? <p className="mt-1 text-xs text-fg-subtle">{hint}</p> : null}
    </>
  );

  const className = cn(
    'block rounded-card border bg-surface p-4 transition-colors',
    emphasis ? 'border-primary/40 bg-primary-soft/30' : 'border-border',
    href && 'hover:border-primary hover:bg-primary-soft/40',
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
