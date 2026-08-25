import { Lightbulb, Link2, Lock, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { listDemands } from '@/application/demands/query';
import { DemandStatusBadge } from '@/components/common/status-badge';
import { DemandFilters } from '@/components/demands/demand-filters';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { WORK_FREQUENCY_LABELS } from '@/domain/demand/types';
import { guardPage } from '@/lib/auth/page-guard';
import { buildDemandHref, parseDemandQuery } from '@/lib/validation/demand';
import type { DemandQueryInput } from '@/lib/validation/demand';

export const metadata: Metadata = { title: '업무 수요' };

export default async function DemandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseDemandQuery(await searchParams);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">업무 수요</h1>
        <p className="mt-1 text-sm text-fg-muted">
          자동화가 필요한 업무를 등록하면 기존 도구를 연결받거나 개발자가 참여를 신청합니다.
        </p>
      </div>

      <Suspense key={JSON.stringify(query)} fallback={<DemandListSkeleton />}>
        <DemandListSection query={query} />
      </Suspense>
    </div>
  );
}

async function DemandListSection({ query }: { query: DemandQueryInput }) {
  const { page, departments } = await guardPage(() => listDemands(query));

  const hasFilters =
    query.keyword !== '' ||
    query.statuses.length > 0 ||
    query.departmentIds.length > 0 ||
    query.onlyMine;

  return (
    <div className="flex flex-col gap-5">
      <DemandFilters query={query} departments={departments} />

      {page.items.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={hasFilters ? '조건에 맞는 수요가 없습니다' : '아직 등록된 수요가 없습니다'}
          description={
            hasFilters
              ? '검색어를 줄이거나 필터를 해제해 보세요.'
              : '반복되는 업무 때문에 시간이 많이 든다면 수요로 남겨 주세요.'
          }
          action={
            hasFilters ? (
              <Link href="/demands" className="text-sm font-medium text-primary hover:underline">
                필터 초기화 →
              </Link>
            ) : (
              <Link href="/demands/new" className="text-sm font-medium text-primary hover:underline">
                수요 등록하기 →
              </Link>
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {page.items.map((entry) => (
              <li
                key={entry.demand.id}
                className="rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/demands/${entry.demand.id}`}
                        className="font-semibold text-fg hover:underline"
                      >
                        {entry.demand.title}
                      </Link>
                      <DemandStatusBadge status={entry.demand.status} />
                      {entry.demand.containsPersonalData ? (
                        <Badge tone="danger" icon={Lock}>
                          개인정보 포함
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                      {entry.demand.mostPainfulStep ||
                        entry.demand.currentWorkDescription ||
                        '내용이 아직 작성되지 않았습니다.'}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-3 text-xs text-fg-subtle">
                    {entry.matchCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <Link2 className="size-3.5" aria-hidden="true" />
                        도구 {entry.matchCount}
                      </span>
                    ) : null}
                    {entry.participantCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden="true" />
                        참여 {entry.participantCount}
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-2 flex flex-wrap gap-x-4 text-xs text-fg-subtle">
                  <div className="flex gap-1">
                    <dt>부서</dt>
                    <dd className="text-fg-muted">{entry.departmentName}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>등록</dt>
                    <dd className="text-fg-muted">{entry.requesterName}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>주기</dt>
                    <dd className="text-fg-muted">
                      {WORK_FREQUENCY_LABELS[entry.demand.workFrequency]}
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
            buildHref={(target) => buildDemandHref(query, { page: target })}
          />
        </>
      )}
    </div>
  );
}

function DemandListSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <span className="sr-only">수요 목록을 불러오는 중입니다.</span>
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}
