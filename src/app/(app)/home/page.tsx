import { ArrowRight, Coins, Lightbulb, Megaphone, Sparkles, Users, Wrench } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadLanding } from '@/application/landing/load';
import { DemandStatusBadge, ToolStatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MEMBER_TYPE_LABELS } from '@/domain/authz/accounts';
import { RUNTIME_KIND_LABELS } from '@/domain/tool/types';
import type { ToolListItem } from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '홈' };

/**
 * 첫 화면 (리뷰 1절·13절).
 *
 * 지표 숫자 대신 **지금 눌러 볼 것**을 앞세운다.
 * 도구 파트와 수요 파트를 나란히 두어, 처음 온 사람이 "쓸 것"과 "만들 것"을
 * 한 화면에서 만나게 한다.
 *
 * 이미지 에셋은 나중에 받기로 했다. 지금은 기능만 세운다 (리뷰 1절).
 */
export default async function HomePage() {
  const data = await guardPage(loadLanding);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card border border-border bg-surface p-6">
        <p className="text-sm text-fg-muted">{data.profile.name} 님, 안녕하세요.</p>
        <h1 className="mt-1 text-2xl font-bold text-fg">
          필요한 도구를 찾고, 없으면 함께 만듭니다
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          교내 구성원이 만든 업무 자동화 도구를 모아 두었습니다. 쓸 만한 것이 없으면 수요를
          올려 주세요. 누군가 만들어 줍니다.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild size="lg">
            <Link href="/tools">
              <Wrench aria-hidden="true" />
              도구 둘러보기
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/demands/new">
              <Lightbulb aria-hidden="true" />
              필요한 것 요청하기
            </Link>
          </Button>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-fg-muted">
            <Coins className="size-4" aria-hidden="true" />내 토큰
            <strong className="tabular-nums text-fg">
              {data.tokenBalance.toLocaleString('ko-KR')}
            </strong>
          </span>
        </div>
      </section>

      {data.isNewcomer ? <Guide /> : null}

      {data.notices.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-fg-subtle" aria-hidden="true" />
              공지
            </CardTitle>
            <Link href="/notices" className="text-sm font-medium text-primary hover:underline">
              전체 보기 →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {data.notices.map((notice) => (
                <li key={notice.id} className="py-2 first:pt-0 last:pb-0">
                  <Link href="/notices" className="flex flex-wrap items-baseline gap-2 text-sm">
                    {notice.pinned ? (
                      <span className="rounded bg-primary-soft px-1.5 py-0.5 text-xs text-primary">
                        고정
                      </span>
                    ) : null}
                    <span className="font-medium text-fg hover:underline">{notice.title}</span>
                    <span className="ml-auto text-xs text-fg-subtle">
                      {formatDateTime(notice.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* -------------------------------------------------------------- 도구 */}
      <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tools-heading" className="text-lg font-bold text-fg">
            도구
          </h2>
          <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
            전체 도구 →
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ToolSection
            title={`${MEMBER_TYPE_LABELS[data.profile.memberType]}에게 맞는 도구`}
            /* AI 가 고른 것이 아니다. 등록자가 "누구에게 맞는지" 표시해 둔 것을 그대로 보여준다. */
            hint="등록한 사람이 표시해 둔 추천 대상을 기준으로 고릅니다."
            items={data.recommendedTools}
            emptyMessage="아직 표시된 도구가 없습니다."
          />
          <ToolSection
            title="많이 쓰는 도구"
            hint="실제로 열어 본 횟수 기준입니다."
            items={data.popularTools}
            emptyMessage="아직 아무도 열어 보지 않았습니다."
          />
        </div>
      </section>

      {/* -------------------------------------------------------------- 수요 */}
      <section aria-labelledby="demands-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="demands-heading" className="text-lg font-bold text-fg">
            업무 수요
          </h2>
          <Link href="/demands" className="text-sm font-medium text-primary hover:underline">
            전체 수요 →
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 올라온 요청</CardTitle>
            </CardHeader>
            <CardContent>
              {data.latestDemands.length === 0 ? (
                <p className="text-sm text-fg-subtle">아직 올라온 수요가 없습니다.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {data.latestDemands.map((demand) => (
                    <li key={demand.id} className="py-2.5 first:pt-0 last:pb-0">
                      <Link href={`/demands/${demand.id}`} className="group block">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-fg group-hover:underline">
                            {demand.title}
                          </span>
                          <DemandStatusBadge status={demand.status} />
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                          {demand.offeredTokens ? (
                            <span className="flex items-center gap-1">
                              <Coins className="size-3" aria-hidden="true" />
                              {demand.offeredTokens.toLocaleString('ko-KR')} 토큰
                            </span>
                          ) : null}
                          <span className="line-clamp-1">{demand.mostPainfulStep}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">사람이 모이는 요청</CardTitle>
            </CardHeader>
            <CardContent>
              {data.activeDemands.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  아직 참여 신청이 없습니다. 먼저 손을 들어 보세요.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {data.activeDemands.map(({ demand, participantCount }) => (
                    <li key={demand.id} className="py-2.5 first:pt-0 last:pb-0">
                      <Link
                        href={`/demands/${demand.id}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="min-w-0 font-medium text-fg hover:underline">
                          {demand.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-fg-muted">
                          <Users className="size-3" aria-hidden="true" />
                          {participantCount}명
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/** 처음 온 사람에게만 보이는 이용 안내 (리뷰 1절) */
function Guide() {
  const steps = [
    {
      title: '먼저 찾아보세요',
      body: '이미 누가 만들어 둔 것이 있을 수 있습니다. 같은 것을 두 번 만들지 않으려고 모아 둔 곳입니다.',
      href: '/tools',
      cta: '도구 목록',
    },
    {
      title: '없으면 요청하세요',
      body: '어떤 업무가 번거로운지 적으면 됩니다. 만들 사람이 보고 문의하거나 참여를 신청합니다.',
      href: '/demands/new',
      cta: '수요 등록',
    },
    {
      title: '만들었다면 공유하세요',
      body: '엑셀 매크로든 웹 도구든 괜찮습니다. 올려 두면 필요한 사람이 찾아 씁니다.',
      href: '/tools/new',
      cta: '도구 등록',
    },
  ];

  return (
    <section
      aria-labelledby="guide-heading"
      className="rounded-card border border-primary/30 bg-primary-soft/20 p-5"
    >
      <h2 id="guide-heading" className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        처음이신가요
      </h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.href} className="rounded-md bg-surface p-4">
            <p className="text-xs font-semibold text-primary">{index + 1}단계</p>
            <p className="mt-1 font-medium text-fg">{step.title}</p>
            <p className="mt-1 text-sm text-fg-muted">{step.body}</p>
            <Link
              href={step.href}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {step.cta}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ToolSection({
  title,
  hint,
  items,
  emptyMessage,
}: {
  title: string;
  hint: string;
  items: readonly ToolListItem[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-fg-subtle">{hint}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-fg-subtle">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.tool.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={`/tools/${item.tool.id}`} className="group block">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg group-hover:underline">
                      {item.tool.name}
                    </span>
                    <ToolStatusBadge status={item.tool.status} />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                    <span>{RUNTIME_KIND_LABELS[item.tool.runtimeKind]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="line-clamp-1">{item.tool.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
