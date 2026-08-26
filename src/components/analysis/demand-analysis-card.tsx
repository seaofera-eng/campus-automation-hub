import { ArrowRight, CircleCheck, CirclePlus, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { DemandAnalysisView } from '@/application/analysis/query';
import { AnalysisProvenanceLine } from '@/components/analysis/analysis-provenance';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DEMAND_MATCH_OUTCOME_LABELS,
  type DemandMatchOutcome,
} from '@/domain/analysis/types';

/**
 * 수요 ↔ 도구 자동 매칭 결과 (수요 상세).
 *
 * ## 이 카드가 답하는 질문
 *
 * "이거 이미 있는 걸로 되나요?" — 수요를 올린 사람과 만들 사람이 둘 다
 * 제일 먼저 물어야 하는 것이고, 대개 아무도 안 묻는 것이다.
 *
 * ## 못 하는 기능을 크게 보여 준다
 *
 * 기존 도구가 채우는 기능보다 **못 채우는 기능**이 중요하다. 그게 그대로
 * 만들 범위가 된다. "조금 고치면 됩니다"로 판정된 건에서는 이 목록이
 * 개발 요청서 초안 노릇을 한다.
 */

const OUTCOME_STYLE: Record<DemandMatchOutcome, { tone: BadgeTone; icon: LucideIcon }> = {
  COVERED: { tone: 'success', icon: CircleCheck },
  PARTIAL: { tone: 'warning', icon: Wrench },
  NOT_COVERED: { tone: 'info', icon: CirclePlus },
};

const OUTCOME_HINT: Record<DemandMatchOutcome, string> = {
  COVERED: '아래 도구를 먼저 써 보시고, 그래도 부족하면 개선 요청을 올려 주세요.',
  PARTIAL: '아래에서 못 하는 기능이 새로 만들 범위입니다.',
  NOT_COVERED: '맞는 도구를 찾지 못했습니다. 만들 사람을 찾는 단계로 넘어갑니다.',
};

export function DemandAnalysisCard({ analysis }: { analysis: DemandAnalysisView }) {
  const style = OUTCOME_STYLE[analysis.outcome];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-4 text-fg-subtle" aria-hidden="true" />
          이미 있는 도구로 되는지 확인
        </CardTitle>
        <AnalysisProvenanceLine
          provenance={analysis.provenance}
          comparedCount={analysis.comparedCount}
        />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={style.tone} icon={style.icon}>
            {DEMAND_MATCH_OUTCOME_LABELS[analysis.outcome]}
          </Badge>
          <span className="text-sm text-fg-muted">{OUTCOME_HINT[analysis.outcome]}</span>
        </div>

        {analysis.findings.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-surface-muted p-4 text-sm text-fg-muted">
            등록된 도구 {analysis.comparedCount}건 중 이 요청에 맞는 것을 찾지 못했습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {analysis.findings.map((finding) => (
              <li key={finding.toolId} className="rounded-card border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/tools/${finding.toolId}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {finding.toolName}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                  <Badge tone="neutral">요청을 {finding.score}% 채움</Badge>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{finding.explanation}</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FeatureList
                    title="이미 되는 것"
                    items={finding.coveredFeatures}
                    emptyText="겹치는 기능이 없습니다."
                    tone="text-success"
                  />
                  <FeatureList
                    title="이 도구로는 안 되는 것"
                    items={finding.missingFeatures}
                    emptyText="요청한 기능을 모두 채웁니다."
                    tone="text-warning"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: readonly string[];
  emptyText: string;
  tone: string;
}) {
  return (
    <div className="min-w-0">
      <p className={`text-xs font-semibold ${tone}`}>{title}</p>
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
