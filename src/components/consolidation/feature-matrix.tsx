import { Check, Minus } from 'lucide-react';
import type {
  ConsolidationToolView,
  FeatureRowView,
} from '@/application/consolidation/query';

/**
 * 묶음 안의 기능을 나란히 놓은 표.
 *
 * ## 왜 표인가
 *
 * "이 셋이 겹칩니다"만으로는 아무것도 못 한다. 어느 도구에 무엇이 있고 없는지가
 * 보여야 무엇을 남기고 무엇을 흡수할지 정할 수 있다.
 *
 * ## 원래 표현을 버리지 않는다
 *
 * 기능을 묶은 것은 글자 겹침 계산이지 사람의 판단이 아니다. 잘못 묶였을 수 있다.
 * 그래서 각 칸에 그 도구가 **원래 쓴 표현**을 그대로 둔다 — 잘못 묶였으면
 * 보는 순간 안다.
 *
 * ## 체크만으로 구분하지 않는다
 *
 * 있음은 체크 아이콘 + 원래 표현, 없음은 가로줄 + "없음". 아이콘 색만 다른
 * 표를 만들지 않는다.
 */
export function FeatureMatrix({
  tools,
  rows,
}: {
  tools: readonly ConsolidationToolView[];
  rows: readonly FeatureRowView[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border bg-surface-muted p-4 text-sm text-fg-muted">
        비교할 기능이 없습니다. 도구 등록 내용에 주요 기능이 적혀 있지 않습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="sr-only">
          묶인 도구 {tools.length}건의 기능 비교. 표현이 비슷한 기능을 한 줄로 묶었습니다.
        </caption>
        <thead>
          <tr className="border-b border-border-strong">
            <th scope="col" className="w-1/3 p-2 text-left font-semibold text-fg-muted">
              기능
            </th>
            {tools.map((tool) => (
              <th key={tool.toolId} scope="col" className="p-2 text-left font-semibold text-fg">
                {tool.name}
                {tool.isSuggestedBase ? (
                  <span className="ml-1 text-xs font-normal text-primary">(기준 제안)</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border align-top">
              <th scope="row" className="p-2 text-left font-medium text-fg">
                {row.label}
                {row.count === tools.length ? (
                  <span className="ml-1 text-xs font-normal text-fg-subtle">(모두 있음)</span>
                ) : null}
              </th>
              {tools.map((tool) => {
                const asWritten = row.byTool[tool.toolId];
                return (
                  <td key={tool.toolId} className="p-2">
                    {asWritten === undefined ? (
                      <span className="flex items-center gap-1 text-fg-subtle">
                        <Minus className="size-3.5 shrink-0" aria-hidden="true" />
                        없음
                      </span>
                    ) : (
                      <span className="flex items-start gap-1 text-fg">
                        <Check
                          className="mt-0.5 size-3.5 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">{asWritten}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
