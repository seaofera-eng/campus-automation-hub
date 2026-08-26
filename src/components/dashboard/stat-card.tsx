import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * 지표 카드.
 *
 * 작은 아이콘 · 이름 · 큰 숫자 · 짧은 보조 문구 순서다 (디자인 문서 §9).
 *
 * ## 카드 바탕은 항상 흰색이다
 *
 * 파란 바탕 KPI 카드를 네 개 늘어놓지 않는다. 넷이 다 강조면 아무것도 강조가
 * 아니고, 화면에서 파란 면적만 커진다. 강조가 필요하면 **테두리와 숫자**만
 * 파랗게 한다.
 */

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
      <p
        className={cn(
          'mt-2 text-2xl font-bold tabular-nums',
          emphasis ? 'text-primary' : 'text-fg',
        )}
      >
        {value.toLocaleString('ko-KR')}
      </p>
      {hint ? <p className="mt-1 text-xs text-fg-subtle">{hint}</p> : null}
    </>
  );

  const className = cn(
    'block rounded-card border bg-surface p-5 shadow-card transition-colors',
    emphasis ? 'border-primary/40' : 'border-border',
    href && 'hover:border-primary',
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
