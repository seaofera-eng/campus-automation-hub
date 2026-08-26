import { Sparkles } from 'lucide-react';
import { josa } from '@/domain/shared/josa';
import { cn } from '@/lib/utils/cn';

/**
 * 아직 분석이 없을 때 그 자리에 놓는 안내.
 *
 * 분석은 등록 신청이 들어올 때 한 번 돌린다. 그 전에 등록된 도구나, 분석이
 * 실패한 건에는 결과가 없다.
 *
 * **비어 있다고 0 을 채우지 않는다.** 흐린 숫자나 자리표시용 막대도 그리지
 * 않는다 — 가려진 실제 결과처럼 보이면 안 된다. 없으면 없다고 쓴다.
 */
export function AnalysisPendingNotice({
  feature,
  fallback,
  className,
}: {
  feature: string;
  /** 그동안 사람이 대신 할 수 있는 일 */
  fallback?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-card border border-dashed border-border-strong bg-surface-muted p-4 text-sm',
        className,
      )}
    >
      <Sparkles className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div>
        <p className="font-medium text-fg">
          {feature}
          {josa(feature, '을를')} 아직 돌리지 않았습니다.
        </p>
        <p className="mt-1 text-fg-muted">
          표시할 점수나 판정을 임의로 만들지 않습니다.
          {fallback ? ` ${fallback}` : ''}
        </p>
      </div>
    </div>
  );
}
