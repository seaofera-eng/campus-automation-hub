import { Copy, CopyCheck, Layers, Link2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  buildConsolidationRequestDraft,
  loadConsolidation,
  type ConsolidationGroupView,
} from '@/application/consolidation/query';
import { ToolStatusBadge } from '@/components/common/status-badge';
import { FeatureMatrix } from '@/components/consolidation/feature-matrix';
import { ImprovementForm } from '@/components/improvements/improvement-form';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DUPLICATE_VERDICT_LABELS,
  type DuplicateVerdict,
} from '@/domain/analysis/types';
import { josa } from '@/domain/shared/josa';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: '통합 표준화' };

/**
 * 통합 표준화 (요구사항 "기존 도구를 참고해 업데이트·통합 표준화").
 *
 * ## 중복 탐지가 끝나는 곳에서 시작한다
 *
 * 검토 화면의 중복 탐지는 등록 신청 한 건을 본다. 여기는 이미 등록된 것들을
 * 통째로 본다 — 이미 벌어진 중복을 정리하는 자리다.
 *
 * ## 자동으로 합치지 않는다
 *
 * 도구를 지우거나 합치는 버튼은 없다. 낼 수 있는 것은 **개선 요청**뿐이고,
 * 그것도 기존 흐름 그대로다. 남의 도구를 정리하는 일은 담당자와 이야기가
 * 되어야 하고, 그 이야기가 개선 요청 스레드에서 벌어지는 편이 낫다.
 */
export default async function ConsolidationPage() {
  const view = await guardPage(() => loadConsolidation());

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">통합 표준화</h1>
        <p className="mt-1 text-sm text-fg-muted">
          같은 일을 하는 도구를 묶어 보여 줍니다. 어느 것을 남기고 무엇을 흡수할지 정하는 데
          쓰는 자료입니다.
        </p>
      </div>

      {view.analyzedToolCount === 0 ? (
        <Alert tone="info" title="중복 분석을 아직 돌리지 않았습니다">
          이 화면은 중복 탐지 결과를 묶어서 보여 줍니다. 분석이 없으면 묶을 것도 없습니다.
          <code className="ml-1 rounded bg-surface-muted px-1">pnpm ai:analyze</code> 로 분석을
          돌린 뒤 다시 보세요. 겹치는 도구가 없다는 뜻이 아닙니다.
        </Alert>
      ) : view.groups.length === 0 ? (
        <EmptyState
          title="겹치는 도구 묶음이 없습니다"
          description={`도구 ${view.analyzedToolCount}건을 분석했지만, 한 묶음으로 볼 만큼 겹치는 것이 없었습니다.`}
        />
      ) : (
        <>
          <p className="text-sm text-fg-muted">
            도구 {view.analyzedToolCount}건의 분석에서 {view.groups.length}개 묶음을 찾았습니다.
          </p>
          {view.groups.map((group) => (
            <ConsolidationGroupCard key={group.key} group={group} />
          ))}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>어떻게 묶었습니까</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-fg-muted">
          <p>
            중복 탐지에서 <strong>사실상 같은 도구</strong> 또는 <strong>많이 겹침</strong>으로
            판정된 관계만 묶습니다. A와 B가 겹치고 B와 C가 겹치면 A와 C를 직접 비교하지 않았어도
            셋이 한 묶음입니다 — 같은 도구가 셋씩 생기는 건 대개 이렇게 한 다리 건너 이어져
            있어서, 아무도 전체를 못 봐서입니다.
          </p>
          <p>
            기능 표의 줄은 <strong>표현이 비슷한 기능</strong>끼리 묶은 것입니다. 도구마다
            제 나름의 말로 적기 때문입니다. 잘못 묶였을 수 있으니 각 칸에 그 도구가 원래 쓴
            표현을 그대로 두었습니다.
          </p>
          <p className="text-fg-subtle">
            묶는 것도 기능을 나란히 놓는 것도 이미 나온 판정을 가지고 하는 계산입니다. 여기서
            모델을 다시 부르지 않습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const VERDICT_STYLE: Record<DuplicateVerdict, { tone: BadgeTone; icon: LucideIcon }> = {
  NEAR_IDENTICAL: { tone: 'danger', icon: CopyCheck },
  HIGH_OVERLAP: { tone: 'warning', icon: Copy },
  RELATED: { tone: 'info', icon: Link2 },
  INDEPENDENT: { tone: 'neutral', icon: Layers },
};

function ConsolidationGroupCard({ group }: { group: ConsolidationGroupView }) {
  const style = VERDICT_STYLE[group.strongestVerdict];
  const base = group.tools.find((tool) => tool.isSuggestedBase);
  const draft = base ? buildConsolidationRequestDraft(base.name, group.absorbable) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Layers className="size-4 text-fg-subtle" aria-hidden="true" />
          도구 {group.tools.length}건이 같은 일을 합니다
          <Badge tone={style.tone} icon={style.icon}>
            {DUPLICATE_VERDICT_LABELS[group.strongestVerdict]} {group.highestScore}점
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {group.tools.map((tool) => (
            <li key={tool.toolId} className="rounded-card border border-border p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/tools/${tool.toolId}`}
                  className="font-medium text-fg hover:underline"
                >
                  {tool.name}
                </Link>
                <ToolStatusBadge status={tool.status} />
                {tool.isSuggestedBase ? <Badge tone="primary">기준 제안</Badge> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{tool.summary}</p>
              <p className="mt-1 text-xs text-fg-subtle">
                {tool.categoryName} · {tool.ownerName} · 기능 {tool.featureCount}개
              </p>
            </li>
          ))}
        </ul>

        <FeatureMatrix tools={group.tools} rows={group.featureRows} />

        {base ? (
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="font-medium text-fg">
              통합 제안: {base.name}
              {josa(base.name, '을를')} 기준으로 삼는 것을 권합니다
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              이 묶음에서 기능을 가장 많이 덮습니다 ({base.featureCount}개). 평가나 사용량은
              보지 않았습니다 — 그건 도구 순위가 답할 질문입니다. 정하는 것은 담당자와의 상의
              뒤입니다.
            </p>

            {group.absorbable.length === 0 ? (
              <p className="mt-2 text-sm text-fg">
                기준 도구가 다른 도구의 기능을 이미 모두 가지고 있습니다. 나머지를 정리할 수
                있는지 담당자와 확인해 주세요.
              </p>
            ) : (
              <>
                <p className="mt-3 text-xs font-semibold text-fg-muted">
                  {base.name}에 없는 기능 {group.absorbable.length}개
                </p>
                <ul className="mt-1 list-inside list-disc text-sm text-fg">
                  {group.absorbable.map((entry) => (
                    <li key={entry.label}>
                      {entry.label}{' '}
                      <span className="text-fg-subtle">
                        (현재 {entry.fromToolNames.join(', ')})
                      </span>
                    </li>
                  ))}
                </ul>

                {draft ? (
                  <div className="mt-3">
                    <ImprovementForm
                      toolId={base.toolId}
                      toolName={base.name}
                      triggerLabel="이 내용으로 개선 요청 만들기"
                      initialTitle={draft.title}
                      initialDetail={draft.detail}
                      initialRequestType="NEW_FEATURE"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
