import { cn } from '@/lib/utils/cn';

/**
 * 상세 화면의 항목 표시.
 *
 * 값이 없을 때 빈칸을 남기지 않고 "미입력"이라고 적는다.
 * 빈칸은 "해당 없음"인지 "아직 안 적었는지" 구분되지 않는다.
 */

export function FieldList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn('flex flex-col', className)}>{children}</dl>;
}

export function FieldRow({
  label,
  value,
  hint,
  /** 줄바꿈이 있는 긴 텍스트 */
  multiline,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  multiline?: boolean;
}) {
  const empty = value === null || value === undefined || value === '';

  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm text-fg-muted">
        {label}
        {hint ? <span className="block text-xs text-fg-subtle">{hint}</span> : null}
      </dt>
      <dd className={cn('min-w-0 text-sm text-fg', multiline && 'whitespace-pre-wrap')}>
        {empty ? <span className="text-fg-subtle">미입력</span> : value}
      </dd>
    </div>
  );
}

/** 금액 표시. 값이 없으면 "파악하지 못함" — 0원과 구분한다. */
export function MoneyValue({ amount }: { amount: number | null }) {
  if (amount === null) return <span className="text-fg-subtle">파악하지 못함</span>;
  return <span className="tabular-nums">{amount.toLocaleString('ko-KR')}원</span>;
}

export function NumberValue({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return <span className="text-fg-subtle">파악하지 못함</span>;
  return (
    <span className="tabular-nums">
      {value.toLocaleString('ko-KR')}
      {unit}
    </span>
  );
}
