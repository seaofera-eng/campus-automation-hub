'use client';

import { Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/field';
import { DEMAND_STATUSES, DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import { buildDemandHref } from '@/lib/validation/demand';
import type { DemandQueryInput } from '@/lib/validation/demand';
import { cn } from '@/lib/utils/cn';

export function DemandFilters({
  query,
}: {
  query: DemandQueryInput;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);

  function apply(overrides: Partial<DemandQueryInput>) {
    router.push(buildDemandHref(query, { ...overrides, page: 1 }));
  }

  function toggle(key: 'statuses', value: string) {
    const current = query[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    apply({ [key]: next } as Partial<DemandQueryInput>);
  }

  const activeCount =
    query.statuses.length +
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
          <label htmlFor="demand-search" className="sr-only">
            수요 검색
          </label>
          <Input
            id="demand-search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목, 업무 내용으로 검색"
            maxLength={100}
          />
          <Button type="submit" variant="secondary">
            <Search aria-hidden="true" />
            검색
          </Button>
        </form>

        <Button asChild>
          <Link href="/demands/new">
            <Plus aria-hidden="true" />
            수요 등록
          </Link>
        </Button>
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
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-fg-muted">상태</legend>
            <div className="flex flex-wrap gap-1.5">
              {DEMAND_STATUSES.map((status) => (
                <Chip
                  key={status}
                  id={`demand-status-${status}`}
                  checked={query.statuses.includes(status)}
                  onChange={() => toggle('statuses', status)}
                >
                  {DEMAND_STATUS_LABELS[status]}
                </Chip>
              ))}
            </div>
          </fieldset>


          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <label
              htmlFor="demand-only-mine"
              className="flex cursor-pointer items-center gap-2 text-sm text-fg"
            >
              <Checkbox
                id="demand-only-mine"
                checked={query.onlyMine}
                onCheckedChange={(value) => apply({ onlyMine: value === true })}
              />
              내가 등록한 수요만
            </label>

            {activeCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKeyword('');
                  router.push('/demands');
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

function Chip({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors',
        checked
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-muted',
      )}
    >
      <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}
