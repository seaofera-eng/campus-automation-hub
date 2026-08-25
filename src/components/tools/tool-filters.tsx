'use client';

import { LayoutGrid, Plus, Search, Table2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, NativeSelect } from '@/components/ui/field';
import {
  DATA_CLASSIFICATIONS,
  DATA_CLASSIFICATION_LABELS,
  TOOL_STATUSES,
  TOOL_STATUS_LABELS,
  isSensitiveClassification,
} from '@/domain/tool/types';
import type { ToolCategory } from '@/domain/tool/types';
import { buildToolHref, TOOL_SORT_KEYS, TOOL_SORT_LABELS } from '@/lib/validation/tool-query';
import type { ToolQuery } from '@/lib/validation/tool-query';
import { cn } from '@/lib/utils/cn';

/**
 * 도구 목록 필터.
 *
 * 모든 조건이 URL 에 들어간다. 그래서 "승인된 개인정보 처리 도구" 같은 화면을
 * 주소만 복사해 공유할 수 있다. 상태는 컴포넌트가 아니라 주소가 들고 있다.
 */
export function ToolFilters({
  query,
  categories,
  canCreate,
}: {
  query: ToolQuery;
  categories: readonly ToolCategory[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);

  function apply(overrides: Partial<ToolQuery>) {
    // 조건이 바뀌면 항상 1페이지로 돌아간다.
    router.push(buildToolHref(query, { ...overrides, page: 1 }));
  }

  function toggle(key: 'statuses' | 'categoryIds' | 'classifications', value: string) {
    const current = query[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    apply({ [key]: next } as Partial<ToolQuery>);
  }

  const activeCount =
    query.statuses.length +
    query.categoryIds.length +
    query.classifications.length +
    (query.keyword ? 1 : 0) +
    (query.onlyMine ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-60 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ keyword });
          }}
        >
          <label htmlFor="tool-search" className="sr-only">
            도구 검색
          </label>
          <Input
            id="tool-search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이름, 소개, 기능으로 검색"
            maxLength={100}
          />
          <Button type="submit" variant="secondary">
            <Search aria-hidden="true" />
            검색
          </Button>
        </form>

        <label htmlFor="tool-sort" className="sr-only">
          정렬
        </label>
        <NativeSelect
          id="tool-sort"
          className="w-40"
          value={query.sort}
          onChange={(event) => apply({ sort: event.target.value as ToolQuery['sort'] })}
        >
          {TOOL_SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {TOOL_SORT_LABELS[key]}
            </option>
          ))}
        </NativeSelect>

        <div className="flex rounded-md border border-border-strong" role="group" aria-label="보기 방식">
          <button
            type="button"
            onClick={() => apply({ view: 'card' })}
            aria-pressed={query.view === 'card'}
            className={cn(
              'flex items-center gap-1.5 rounded-l-md px-3 py-2 text-sm transition-colors',
              query.view === 'card' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted',
            )}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
            카드
          </button>
          <button
            type="button"
            onClick={() => apply({ view: 'table' })}
            aria-pressed={query.view === 'table'}
            className={cn(
              'flex items-center gap-1.5 rounded-r-md px-3 py-2 text-sm transition-colors',
              query.view === 'table' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted',
            )}
          >
            <Table2 className="size-4" aria-hidden="true" />
            표
          </button>
        </div>

        {canCreate ? (
          <Button asChild size="lg" className="ml-auto shadow-sm">
            <Link href="/tools/new">
              <Plus aria-hidden="true" />내 도구 공유하기
            </Link>
          </Button>
        ) : null}
      </div>

      <details className="rounded-card border border-border bg-surface" open={activeCount > 0}>
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-fg">
          상세 필터
          {activeCount > 0 ? (
            <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
              {activeCount}개 적용 중
            </span>
          ) : null}
        </summary>

        <div className="flex flex-col gap-4 border-t border-border p-4">
          <FilterGroup label="상태">
            {TOOL_STATUSES.map((status) => (
              <FilterChip
                key={status}
                id={`status-${status}`}
                checked={query.statuses.includes(status)}
                onChange={() => toggle('statuses', status)}
              >
                {TOOL_STATUS_LABELS[status]}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="카테고리">
            {categories.map((category) => (
              <FilterChip
                key={category.id}
                id={`category-${category.id}`}
                checked={query.categoryIds.includes(category.id)}
                onChange={() => toggle('categoryIds', category.id)}
              >
                {category.name}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="다루는 데이터">
            {DATA_CLASSIFICATIONS.map((classification) => (
              <FilterChip
                key={classification}
                id={`classification-${classification}`}
                checked={query.classifications.includes(classification)}
                onChange={() => toggle('classifications', classification)}
                emphasis={isSensitiveClassification(classification)}
              >
                {DATA_CLASSIFICATION_LABELS[classification]}
              </FilterChip>
            ))}
          </FilterGroup>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <label
              htmlFor="only-mine"
              className="flex cursor-pointer items-center gap-2 text-sm text-fg"
            >
              <Checkbox
                id="only-mine"
                checked={query.onlyMine}
                onCheckedChange={(value) => apply({ onlyMine: value === true })}
              />
              내가 담당·개발한 도구만
            </label>

            {activeCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKeyword('');
                  router.push('/tools');
                }}
              >
                <X aria-hidden="true" />
                필터 초기화
              </Button>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-fg-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function FilterChip({
  id,
  checked,
  onChange,
  emphasis,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
        checked
          ? 'border-primary bg-primary text-primary-fg'
          : emphasis
            ? 'border-danger/30 bg-danger-soft text-danger hover:bg-danger-soft/70'
            : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-muted',
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}
