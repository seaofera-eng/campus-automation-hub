import { CircleCheck, GitCompareArrows, Info, ScanSearch, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { QualityReviewView } from '@/application/analysis/query';
import { AnalysisProvenanceLine } from '@/components/analysis/analysis-provenance';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  QUALITY_REVIEW_KIND_LABELS,
  QUALITY_SEVERITY_LABELS,
  QUALITY_VERDICT_LABELS,
  type QualitySeverity,
  type QualityVerdict,
} from '@/domain/analysis/types';

/**
 * 멀티 LLM 품질검증 결과 (검토 화면).
 *
 * ## 어느 모델이 무엇을 봤는지 밝힌다
 *
 * 관점마다 모델 이름을 붙여 놓는다. "AI 가 검증했습니다"는 아무 말도 아니다.
 * 어느 모델이 어떤 각도에서 봤는지가 있어야 검토자가 이 결과를 얼마나 믿을지
 * 스스로 정한다.
 *
 * ## 갈린 것을 감추지 않는다
 *
 * 두 모델의 판정이 갈리면 그 사실을 맨 위에 띄운다. 자동으로 한쪽 편들지
 * 않는다 — 갈렸다는 것 자체가 사람이 봐야 한다는 신호다.
 */

const VERDICT_STYLE: Record<QualityVerdict, { tone: BadgeTone; icon: LucideIcon }> = {
  PASS: { tone: 'success', icon: CircleCheck },
  NEEDS_HUMAN_REVIEW: { tone: 'warning', icon: GitCompareArrows },
  FAIL: { tone: 'danger', icon: TriangleAlert },
};

const SEVERITY_STYLE: Record<QualitySeverity, { tone: BadgeTone; icon: LucideIcon }> = {
  BLOCKER: { tone: 'danger', icon: TriangleAlert },
  WARNING: { tone: 'warning', icon: TriangleAlert },
  NOTE: { tone: 'neutral', icon: Info },
};

export function QualityReviewCard({ review }: { review: QualityReviewView }) {
  const style = VERDICT_STYLE[review.verdict];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanSearch className="size-4 text-fg-subtle" aria-hidden="true" />
          멀티 LLM 품질검증
        </CardTitle>
        <p className="text-sm text-fg-muted">
          서로 다른 모델 둘이 등록 내용을 각각 다른 관점에서 봤습니다. 승인·반려는 검토자가
          정합니다.
        </p>
        <AnalysisProvenanceLine provenance={review.provenance} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={style.tone} icon={style.icon}>
            {QUALITY_VERDICT_LABELS[review.verdict]}
          </Badge>
          <span className="text-sm text-fg-muted">
            {review.totalFindings === 0
              ? '두 관점 모두 짚은 것이 없습니다.'
              : `짚은 것 ${review.totalFindings}건${
                  review.blockerCount > 0 ? ` (확인 필요 ${review.blockerCount}건)` : ''
                }`}
          </span>
        </div>

        {review.disagreement ? (
          <Alert tone="warning" title="두 모델의 판정이 갈렸습니다">
            한쪽은 이상 없다고 보고 다른 쪽은 짚은 것이 있습니다. 자동으로 한쪽을 따르지 않습니다
            — 아래 내용을 직접 읽고 판단해 주세요.
          </Alert>
        ) : null}

        <ul className="flex flex-col gap-3">
          {review.results.map((result) => (
            <li key={result.kind} className="rounded-card border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fg">
                  {QUALITY_REVIEW_KIND_LABELS[result.kind]}
                </span>
                <Badge tone="info">{result.model}</Badge>
                {result.passed ? (
                  <Badge tone="success" icon={CircleCheck}>
                    짚은 것 없음
                  </Badge>
                ) : (
                  <Badge tone="warning">{result.findings.length}건</Badge>
                )}
              </div>

              {result.findings.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-3">
                  {result.findings.map((finding) => {
                    const severity = SEVERITY_STYLE[finding.severity];
                    return (
                      <li
                        key={`${result.kind}-${finding.title}`}
                        className="border-l-2 border-border-strong pl-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={severity.tone} icon={severity.icon}>
                            {QUALITY_SEVERITY_LABELS[finding.severity]}
                          </Badge>
                          <span className="text-sm font-medium text-fg">{finding.title}</span>
                        </div>
                        <p className="mt-1 text-sm text-fg-muted">
                          등록 내용: {finding.evidence}
                        </p>
                        {finding.suggestion ? (
                          <p className="mt-1 text-sm text-fg">{finding.suggestion}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
