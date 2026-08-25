import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * 서버 페이지네이션.
 *
 * 페이지 상태는 URL(`?page=`)에 있다. 링크로 만들었기 때문에 새 탭 열기·뒤로가기·
 * 주소 공유가 모두 자연스럽게 동작한다.
 */

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  /** 현재 검색 조건을 유지한 채 page 만 바꾼 URL 을 만든다. */
  buildHref: (page: number) => string;
  className?: string;
}

/** 현재 페이지 주변과 처음·끝만 보여준다. `null` 은 생략(…) 표시. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  let previous = 0;
  for (const current of sorted) {
    if (previous && current - previous > 1) result.push(null);
    result.push(current);
    previous = current;
  }
  return result;
}

const itemClasses =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors';

export function Pagination({
  page,
  totalPages,
  totalItems,
  buildHref,
  className,
}: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <p className={cn('text-sm text-fg-muted', className)}>총 {totalItems.toLocaleString()}건</p>
    );
  }

  return (
    <nav
      aria-label="페이지 이동"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-sm text-fg-muted">
        총 {totalItems.toLocaleString()}건 · {page}/{totalPages} 페이지
      </p>

      <ul className="flex items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              rel="prev"
              aria-label="이전 페이지"
              className={cn(itemClasses, 'border-border-strong bg-surface hover:bg-surface-muted')}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={cn(itemClasses, 'border-border bg-surface-muted text-fg-subtle')}
            >
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>

        {pageWindow(page, totalPages).map((value, index) =>
          value === null ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-fg-subtle">
              …
            </li>
          ) : (
            <li key={value}>
              <Link
                href={buildHref(value)}
                aria-current={value === page ? 'page' : undefined}
                aria-label={`${value} 페이지`}
                className={cn(
                  itemClasses,
                  value === page
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-border-strong bg-surface hover:bg-surface-muted',
                )}
              >
                {value}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              rel="next"
              aria-label="다음 페이지"
              className={cn(itemClasses, 'border-border-strong bg-surface hover:bg-surface-muted')}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={cn(itemClasses, 'border-border bg-surface-muted text-fg-subtle')}
            >
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
