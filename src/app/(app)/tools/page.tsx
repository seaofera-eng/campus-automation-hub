import { Wrench } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { listTools } from '@/application/tools/query';
import { ToolCard } from '@/components/tools/tool-card';
import { ToolFilters } from '@/components/tools/tool-filters';
import { ToolTable } from '@/components/tools/tool-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { guardPage } from '@/lib/auth/page-guard';
import { buildToolHref, parseToolQuery } from '@/lib/validation/tool-query';
import type { ToolQuery } from '@/lib/validation/tool-query';

export const metadata: Metadata = { title: '자동화 도구' };

/**
 * 목록 화면.
 *
 * 로딩 표시는 `loading.tsx` 가 아니라 이 파일 안의 Suspense 로 한다.
 * `loading.tsx` 를 세그먼트에 두면 하위 경로(`/tools/[id]`, `/tools/new`)까지
 * 로딩 경계가 내려가고, 응답 헤더가 먼저 나가 버려서 그 페이지들의
 * `notFound()` 가 404 대신 200 을 반환하게 된다.
 */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseToolQuery(await searchParams);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">자동화 도구</h1>
        <p className="mt-1 text-sm text-fg-muted">
          교내에 등록된 AI 서비스와 업무 자동화 도구입니다.
        </p>
      </div>

      <Suspense key={JSON.stringify(query)} fallback={<ToolListSkeleton />}>
        <ToolListSection query={query} />
      </Suspense>
    </div>
  );
}

async function ToolListSection({ query }: { query: ToolQuery }) {
  const { page, categories, canCreate } = await guardPage(() => listTools(query));

  const hasFilters =
    query.keyword !== '' ||
    query.statuses.length > 0 ||
    query.categoryIds.length > 0 ||
    query.classifications.length > 0 ||
    query.onlyMine;

  return (
    <div className="flex flex-col gap-5">
      <ToolFilters
        query={query}
        categories={categories}
        canCreate={canCreate}
      />

      {page.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={hasFilters ? '조건에 맞는 도구가 없습니다' : '아직 등록된 도구가 없습니다'}
          description={
            hasFilters
              ? '검색어를 줄이거나 필터를 해제해 보세요.'
              : canCreate
                ? '첫 도구를 등록해 보세요. 임시저장하며 천천히 작성할 수 있습니다.'
                : '도구가 등록되면 이곳에 표시됩니다.'
          }
          action={
            hasFilters ? (
              <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
                필터 초기화 →
              </Link>
            ) : canCreate ? (
              <Link href="/tools/new" className="text-sm font-medium text-primary hover:underline">
                도구 등록하기 →
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          {query.view === 'card' ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {page.items.map((item) => (
                <ToolCard key={item.tool.id} item={item} />
              ))}
            </ul>
          ) : (
            <ToolTable items={page.items} />
          )}

          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            totalItems={page.totalItems}
            buildHref={(target) => buildToolHref(query, { page: target })}
          />
        </>
      )}
    </div>
  );
}

function ToolListSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-live="polite">
      <span className="sr-only">도구 목록을 불러오는 중입니다.</span>
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-52" />
        ))}
      </div>
    </div>
  );
}
