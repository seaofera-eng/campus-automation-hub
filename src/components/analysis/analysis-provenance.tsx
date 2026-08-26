import { BadgeCheck, Bot, CircleAlert } from 'lucide-react';
import type { AnalysisProvenanceView } from '@/application/analysis/query';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/datetime';

/**
 * 이 판단이 어디서 나왔는지 알리는 한 줄.
 *
 * AI 결과를 보여 주는 자리에는 **예외 없이** 붙는다. 모델 이름과 만든 시각이
 * 없으면 이 화면의 숫자는 어디서 왔는지 알 수 없는 숫자가 된다.
 *
 * "사람이 확인했는가"를 같이 낸다. 아직 확인 전이면 그렇게 적는다 — 감추면
 * 검토를 마친 것처럼 보인다.
 */
export function AnalysisProvenanceLine({
  provenance,
  comparedCount,
}: {
  provenance: AnalysisProvenanceView;
  /** 몇 건과 비교했는지. 없으면 표시하지 않는다. */
  comparedCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
      <Badge tone="info" icon={Bot}>
        {provenance.model}
      </Badge>
      <span>{formatDateTime(provenance.generatedAt)} 분석</span>
      {comparedCount !== undefined ? <span>· 도구 {comparedCount}건과 비교</span> : null}

      {provenance.humanReviewed ? (
        <Badge tone="success" icon={BadgeCheck}>
          {provenance.reviewerName ? `${provenance.reviewerName} 확인함` : '사람이 확인함'}
        </Badge>
      ) : (
        <Badge tone="warning" icon={CircleAlert}>
          아직 사람이 확인하지 않음
        </Badge>
      )}
    </div>
  );
}
