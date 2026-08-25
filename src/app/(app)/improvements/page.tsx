import { AlertTriangle, Wand2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { listImprovements } from '@/application/improvements/query';
import { ImprovementStatusBadge } from '@/components/common/status-badge';
import { ImprovementFilters } from '@/components/improvements/improvement-filters';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { IMPROVEMENT_TYPE_LABELS, URGENCY_LEVEL_LABELS } from '@/domain/improvement/types';
import { guardPage } from '@/lib/auth/page-guard';
import { buildImprovementHref, parseImprovementQuery } from '@/lib/validation/improvement';
import type { ImprovementQueryInput } from '@/lib/validation/improvement';
import { formatDate } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '개선 요청' };

export default async function ImprovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseImprovementQuery(await searchParams);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">개선 요청</h1>
        <p className="mt-1 text-sm text-fg-muted">
          도구를 쓰면서 불편했던 점과 필요한 기능을 모아 처리합니다.
        </p>
      </div>

      <Suspense key={JSON.stringify(query)} fallback={<ImprovementListSkeleton />}>
        <ImprovementListSection query={query} />
      </Suspense>
    </div>
  );
}

async function ImprovementListSection({ query }: { query: ImprovementQueryInput }) {
  const { page, statusCounts, tools } = await guardPage(() => listImprovements(query));

  const hasFilters =
    query.keyword !== '' ||
    query.statuses.length > 0 ||
    query.toolId !== '' ||
    query.assignedToMe ||
    query.requestedByMe;

  const openCount = statusCounts.OPEN + statusCounts.REVIEWING + statusCounts.IN_PROGRESS;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">처리 중</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{openCount}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">반영 완료</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{statusCounts.RELEASED}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">반려</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{statusCounts.REJECTED}</p>
        </div>
      </div>

      <ImprovementFilters query={query} tools={tools} />

      {page.items.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title={hasFilters ? '조건에 맞는 요청이 없습니다' : '아직 등록된 개선 요청이 없습니다'}
          description={
            hasFilters
              ? '검색어를 줄이거나 필터를 해제해 보세요.'
              : '도구 상세 화면에서 개선을 요청할 수 있습니다.'
          }
          action={
            hasFilters ? (
              <Link
                href="/improvements"
                className="text-sm font-medium text-primary hover:underline"
              >
                필터 초기화 →
              </Link>
            ) : (
              <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
                도구 목록 보기 →
              </Link>
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {page.items.map((entry) => (
              <li
                key={entry.request.id}
                className="rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/improvements/${entry.request.id}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {entry.request.title}
                      </Link>
                      <ImprovementStatusBadge status={entry.request.status} />
                      <Badge tone="neutral">
                        {IMPROVEMENT_TYPE_LABELS[entry.request.requestType]}
                      </Badge>
                      {entry.request.urgency === 'HIGH' ? (
                        <Badge tone="danger" icon={AlertTriangle}>
                          시급
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-fg-muted">
                      {entry.request.detail}
                    </p>
                  </div>

                  <div className="shrink-0 text-right text-xs text-fg-subtle">
                    <p>{entry.assigneeName ? `${entry.assigneeName} 담당` : '담당자 미배정'}</p>
                    {entry.request.targetCompletionDate ? (
                      <p>
                        목표{' '}
                        {formatDate(entry.request.targetCompletionDate)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-2 flex flex-wrap gap-x-4 text-xs text-fg-subtle">
                  <div className="flex gap-1">
                    <dt>도구</dt>
                    <dd className="text-fg-muted">
                      <Link href={`/tools/${entry.request.toolId}`} className="hover:underline">
                        {entry.toolName}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>요청</dt>
                    <dd className="text-fg-muted">{entry.requesterName}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>시급도</dt>
                    <dd className="text-fg-muted">
                      {URGENCY_LEVEL_LABELS[entry.request.urgency]}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            totalItems={page.totalItems}
            buildHref={(target) => buildImprovementHref(query, { page: target })}
          />
        </>
      )}
    </div>
  );
}

function ImprovementListSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <span className="sr-only">개선 요청을 불러오는 중입니다.</span>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  );
}
