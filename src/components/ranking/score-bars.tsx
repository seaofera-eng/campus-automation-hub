import type { RankingBreakdown } from '@/domain/ranking';
import { cn } from '@/lib/utils/cn';

/**
 * 축별 점수를 막대로 펼친다.
 *
 * 총점만 보여 주면 "왜 우리 도구가 3위냐"에 답할 수 없다. 어느 축이 낮은지
 * 보여야 만든 사람이 무엇을 고칠지 안다.
 *
 * 막대는 색만으로 구분되지 않는다. 이름과 숫자를 항상 옆에 적고, 막대는
 * 눈으로 훑기 쉬우라고 덧붙이는 것이다. 스크린 리더에는 숫자가 그대로 읽힌다.
 */

const AXES: readonly { key: keyof RankingBreakdown; label: string }[] = [
  { key: 'satisfaction', label: '만족도' },
  { key: 'adoption', label: '실제 쓰임' },
  { key: 'stability', label: '안정성' },
  { key: 'safety', label: '안전' },
  { key: 'maintenance', label: '관리' },
];

export function ScoreBars({
  breakdown,
  className,
}: {
  breakdown: RankingBreakdown;
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-x-4 gap-y-1.5 sm:grid-cols-2', className)}>
      {AXES.map((axis) => {
        const value = breakdown[axis.key];
        return (
          <div key={axis.key} className="flex items-center gap-2">
            <dt className="w-16 shrink-0 text-xs text-fg-muted">{axis.label}</dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-soft"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-fg-muted">
                {value}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
