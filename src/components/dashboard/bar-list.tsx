import { cn } from '@/lib/utils/cn';

/**
 * 가로 막대 분포.
 *
 * 차트 라이브러리를 쓰지 않는다. 막대는 시각적 보조일 뿐이고
 * 실제 값은 항상 숫자 라벨로 함께 적는다 (요구사항 12번: 색만으로 구분하지 않는다).
 * 마크업은 표라서 스크린리더가 그대로 읽을 수 있다.
 */

export interface BarListProps {
  caption: string;
  items: readonly { label: string; count: number }[];
  emptyMessage: string;
  className?: string;
}

export function BarList({ caption, items, emptyMessage, className }: BarListProps) {
  if (items.length === 0) {
    return <p className={cn('text-sm text-fg-muted', className)}>{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.count), 1);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <table className={cn('w-full text-sm', className)}>
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">항목</th>
          <th scope="col">건수</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <th scope="row" className="w-1/3 py-1.5 pr-3 text-left font-normal text-fg">
              {item.label}
            </th>
            <td className="py-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-fg-muted">
                  {item.count.toLocaleString()}건
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className="pt-2 text-left text-xs font-normal text-fg-subtle">
            합계
          </th>
          <td className="pt-2 text-right text-xs tabular-nums text-fg-subtle">
            {total.toLocaleString()}건
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
