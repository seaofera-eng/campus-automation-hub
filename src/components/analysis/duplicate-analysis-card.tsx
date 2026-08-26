import { ArrowRight, Copy, CopyCheck, GitMerge, Layers, Link2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { DuplicateAnalysisView } from '@/application/analysis/query';
import { AnalysisProvenanceLine } from '@/components/analysis/analysis-provenance';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DUPLICATE_RECOMMENDATION_LABELS,
  DUPLICATE_VERDICT_LABELS,
  type DuplicateRecommendation,
  type DuplicateVerdict,
} from '@/domain/analysis/types';

/**
 * 중복 자동화 탐지 결과 (검토 화면).
 *
 * ## 무엇을 먼저 보여 주는가
 *
 * 검토자가 알고 싶은 건 점수가 아니라 **어떻게 할지**다. 그래서 처리 제안을
 * 판정 배지 옆에 같이 둔다. "높은 중복 가능성 87점"만 보여 주면 검토자는
 * 그래서 승인하라는 건지 반려하라는 건지 다시 고민해야 한다.
 *
 * ## 겹치는 점과 다른 점을 나란히 둔다
 *
 * 겹치는 점만 보여 주면 무조건 중복처럼 읽힌다. 다른 점을 같은 크기로 놓아야
 * 검토자가 스스로 판단할 수 있다. 모델이 다른 점을 대지 못했다면 그것도
 * 그대로 보인다.
 *
 * 화면에는 판단만 나오고 최종 결정 버튼은 없다. 결정은 옆의 검토 작업 패널에서
 * 검토자가 한다.
 */

const VERDICT_STYLE: Record<DuplicateVerdict, { tone: BadgeTone; icon: LucideIcon }> = {
  NEAR_IDENTICAL: { tone: 'danger', icon: CopyCheck },
  HIGH_OVERLAP: { tone: 'warning', icon: Copy },
  RELATED: { tone: 'info', icon: Link2 },
  INDEPENDENT: { tone: 'neutral', icon: Layers },
};

const RECOMMENDATION_STYLE: Record<DuplicateRecommendation, BadgeTone> = {
  USE_EXISTING: 'danger',
  MERGE_INTO_EXISTING: 'warning',
  DIFFERENTIATE: 'info',
  PROCEED: 'success',
};

export function DuplicateAnalysisCard({ analysis }: { analysis: DuplicateAnalysisView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-4 text-fg-subtle" aria-hidden="true" />
          중복 자동화 탐지
        </CardTitle>
        <p className="text-sm text-fg-muted">
          이미 등록된 도구와 겹치는지 미리 분석해 둔 결과입니다. 최종 판단은 검토자가 합니다.
        </p>
        <AnalysisProvenanceLine
          provenance={analysis.provenance}
          comparedCount={analysis.comparedCount}
        />
      </CardHeader>

      <CardContent>
        {analysis.findings.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-surface-muted p-4 text-sm text-fg-muted">
            겹치는 도구를 찾지 못했습니다. 등록된 도구 {analysis.comparedCount}건과 비교한
            결과입니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {analysis.findings.map((finding) => {
              const style = VERDICT_STYLE[finding.verdict];
              return (
                <li
                  key={finding.candidateToolId}
                  className="flex flex-col gap-3 rounded-card border border-border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={style.tone} icon={style.icon}>
                      {DUPLICATE_VERDICT_LABELS[finding.verdict]} {finding.score}점
                    </Badge>
                    <Badge
                      tone={RECOMMENDATION_STYLE[finding.recommendation]}
                      icon={GitMerge}
                    >
                      {DUPLICATE_RECOMMENDATION_LABELS[finding.recommendation]}
                    </Badge>

                    {finding.candidateAvailable ? (
                      <Link
                        href={`/tools/${finding.candidateToolId}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {finding.candidateToolName}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="text-sm text-fg-subtle">
                        {finding.candidateToolName} (분석 이후 삭제됨)
                      </span>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-fg">{finding.explanation}</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <OverlapList
                      title="겹치는 점"
                      items={finding.overlapping}
                      emptyText="겹치는 점을 짚지 못했습니다."
                    />
                    <OverlapList
                      title="다른 점"
                      items={finding.distinct}
                      emptyText="다른 점을 찾지 못했습니다."
                    />
                  </div>

                  <p className="text-xs text-fg-subtle">
                    표현이 겹치는 정도 {finding.lexicalOverlap}% — 후보를 추릴 때 쓴 값이며,
                    중복 판정과는 다릅니다.
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OverlapList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: readonly string[];
  emptyText: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-fg-muted">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-fg-subtle">{emptyText}</p>
      ) : (
        <ul className="mt-1 list-inside list-disc text-sm text-fg">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
