import { Info, Medal, Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadRanking, type RankingEntryView } from '@/application/ranking/query';
import { ToolStatusBadge } from '@/components/common/status-badge';
import { ScoreBars } from '@/components/ranking/score-bars';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '도구 순위' };

/**
 * 도구 순위 (요구사항 "순위 추천").
 *
 * ## 계산 근거를 감추지 않는다
 *
 * 축별 점수를 막대로 펼쳐 놓는다. 총점만 보여 주면 "왜 우리 도구가 3위냐"는
 * 물음에 답할 수 없고, 그러면 순위 자체를 아무도 안 믿는다.
 *
 * 가중치도 화면 아래에 그대로 적어 둔다. 심사에서 나올 질문이기도 하지만,
 * 무엇보다 도구를 만든 사람이 "무엇을 고치면 올라가는지" 알 수 있어야 한다.
 */
export default async function RankingPage() {
  const view = await guardPage(() => loadRanking());

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">도구 순위</h1>
        <p className="mt-1 text-sm text-fg-muted">
          평가 점수 하나로 줄 세우지 않습니다. 만족도·실제 쓰임·안정성·안전·관리 상태를 함께
          봅니다.
        </p>
      </div>

      {view.entries.length === 0 ? (
        <EmptyState
          title="순위를 매길 도구가 없습니다"
          description="도구가 등록되면 이 화면에 순위가 나타납니다."
        />
      ) : (
        <>
          {view.recommended.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="size-4 text-warning" aria-hidden="true" />
                  이럴 때 추천합니다
                </CardTitle>
                <p className="text-sm text-fg-muted">
                  평가가 {view.guards.minimumEvaluations}건 이상 쌓인 도구 중 상위{' '}
                  {view.recommended.length}건입니다.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 md:grid-cols-3">
                  {view.recommended.map((entry) => (
                    <li key={entry.toolId} className="rounded-card border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone="warning" icon={Medal}>
                          {entry.rank}위
                        </Badge>
                        <span className="text-sm font-semibold tabular-nums text-fg">
                          {entry.totalScore}점
                        </span>
                      </div>
                      <Link
                        href={`/tools/${entry.toolId}`}
                        className="mt-2 block font-medium text-fg hover:underline"
                      >
                        {entry.name}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{entry.summary}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Alert tone="info" title="아직 추천할 만큼 평가가 쌓이지 않았습니다">
              평가가 {view.guards.minimumEvaluations}건 이상인 도구가 없습니다. 아래 순위표는
              그대로 볼 수 있습니다.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>전체 순위 ({view.entries.length})</CardTitle>
              <p className="text-sm text-fg-muted">
                {formatDateTime(view.generatedAt)} 기준 · 화면을 열 때마다 다시 계산합니다.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {view.entries.map((entry) => (
                  <RankingRow key={entry.toolId} entry={entry} />
                ))}
              </ul>
            </CardContent>
          </Card>

          {view.excluded.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>순위에서 뺀 도구 ({view.excluded.length})</CardTitle>
                <p className="text-sm text-fg-muted">
                  왜 빠졌는지 함께 적습니다. 조용히 감추지 않습니다.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {view.excluded.map((entry) => (
                    <li
                      key={entry.toolId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                    >
                      <Link
                        href={`/tools/${entry.toolId}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {entry.name}
                      </Link>
                      <span className="text-fg-muted">{entry.reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4 text-fg-subtle" aria-hidden="true" />
                어떻게 계산했습니까
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <WeightRow
                  label="만족도"
                  weight={view.weights.satisfaction}
                  help={`평가 평균을 전체 평균 ${view.campusAverage}점 쪽으로 보정합니다. 평가 ${view.guards.bayesianPriorWeight}건 몫의 무게로 끌어당겨, 평가가 적은 도구가 만점으로 1위를 하지 못하게 합니다.`}
                />
                <WeightRow
                  label="실제 쓰임"
                  weight={view.weights.adoption}
                  help="실행 링크를 누른 서로 다른 사람 수를 봅니다. 조회 수는 세지 않습니다 — 열어만 본 것은 쓴 게 아닙니다."
                />
                <WeightRow
                  label="안정성"
                  weight={view.weights.stability}
                  help="아직 처리되지 않은 오류 신고가 있으면 내려갑니다. 처리된 신고는 감점하지 않습니다."
                />
                <WeightRow
                  label="안전"
                  weight={view.weights.safety}
                  help="검토자가 확정한 위험 등급을 씁니다. 체크리스트가 없으면 중간값입니다 — 모르는 것을 안전으로 치지 않습니다."
                />
                <WeightRow
                  label="관리 상태"
                  weight={view.weights.maintenance}
                  help={`${view.guards.staleAfterDays}일 넘게 손대지 않으면 0점이 됩니다. 개선 요청을 반영한 이력이 있으면 올려 줍니다.`}
                />
              </dl>

              <p className="text-fg-muted">
                {view.guards.excludedStatuses.join(', ')} 상태이거나 위험 등급이{' '}
                {view.guards.excludedRiskLevel} 인 도구는 순위에서 뺍니다.
              </p>
              <p className="text-fg-subtle">
                이 순위에는 AI 를 쓰지 않습니다. 기록을 세어 계산한 값이라 누구나 다시 계산해
                확인할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RankingRow({ entry }: { entry: RankingEntryView }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border p-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex shrink-0 items-baseline gap-1 sm:w-16 sm:flex-col sm:items-center sm:gap-0">
        <span className="text-2xl font-bold tabular-nums text-fg">{entry.rank}</span>
        <span className="text-xs text-fg-subtle">위</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/tools/${entry.toolId}`}
            className="font-semibold text-fg hover:underline"
          >
            {entry.name}
          </Link>
          <ToolStatusBadge status={entry.status as never} />
          <Badge tone="neutral">{entry.categoryName}</Badge>
          {entry.belowEvaluationThreshold ? (
            <Badge tone="warning" icon={Info}>
              표본 부족 — 추천에서 제외
            </Badge>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-fg-muted">
          {entry.averageScore === null
            ? '평가 없음'
            : `평가 ${entry.evaluationCount}건 · 평균 ${entry.averageScore}점`}
          {entry.distinctLaunchUsers > 0
            ? ` · ${entry.distinctLaunchUsers}명이 실행`
            : ' · 실행 기록 없음'}
        </p>

        <ScoreBars breakdown={entry.breakdown} className="mt-3" />
      </div>

      <div className="shrink-0 text-right sm:w-20">
        <span className="text-lg font-bold tabular-nums text-fg">{entry.totalScore}</span>
        <span className="ml-0.5 text-xs text-fg-subtle">점</span>
      </div>
    </li>
  );
}

function WeightRow({
  label,
  weight,
  help,
}: {
  label: string;
  weight: number;
  help: string;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="font-medium text-fg">
        {label} <span className="text-fg-subtle">{Math.round(weight * 100)}%</span>
      </dt>
      <dd className="mt-1 text-fg-muted">{help}</dd>
    </div>
  );
}
