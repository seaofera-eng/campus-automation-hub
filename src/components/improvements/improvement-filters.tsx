'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, NativeSelect } from '@/components/ui/field';
import { IMPROVEMENT_STATUSES, IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import { buildImprovementHref } from '@/lib/validation/improvement';
import type { ImprovementQueryInput } from '@/lib/validation/improvement';
import { cn } from '@/lib/utils/cn';

export function ImprovementFilters({
  query,
  tools,
}: {
  query: ImprovementQueryInput;
  tools: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);

  function apply(overrides: Partial<ImprovementQueryInput>) {
    router.push(buildImprovementHref(query, { ...overrides, page: 1 }));
  }

  function toggleStatus(status: string) {
    const next = query.statuses.includes(status)
      ? query.statuses.filter((item) => item !== status)
      : [...query.statuses, status];
    apply({ statuses: next });
  }

  const activeCount =
    query.statuses.length +
    (query.keyword ? 1 : 0) +
    (query.toolId ? 1 : 0) +
    (query.assignedToMe ? 1 : 0) +
    (query.requestedByMe ? 1 : 0);

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
          <label htmlFor="improvement-search" className="sr-only">
            개선 요청 검색
          </label>
          <Input
            id="improvement-search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목, 내용으로 검색"
            maxLength={100}
          />
          <Button type="submit" variant="secondary">
            <Search aria-hidden="true" />
            검색
          </Button>
        </form>

        <label htmlFor="improvement-tool" className="sr-only">
          도구 선택
        </label>
        <NativeSelect
          id="improvement-tool"
          className="w-56"
          value={query.toolId}
          onChange={(event) => apply({ toolId: event.target.value })}
        >
          <option value="">모든 도구</option>
          {tools.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {IMPROVEMENT_STATUSES.map((status) => (
          <label
            key={status}
            htmlFor={`improvement-status-${status}`}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors',
              query.statuses.includes(status)
                ? 'border-primary bg-primary text-primary-fg'
                : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-muted',
            )}
          >
            <input
              id={`improvement-status-${status}`}
              type="checkbox"
              className="sr-only"
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
            />
            {IMPROVEMENT_STATUS_LABELS[status]}
          </label>
        ))}

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <label
          htmlFor="assigned-to-me"
          className="flex cursor-pointer items-center gap-1.5 text-xs text-fg"
        >
          <Checkbox
            id="assigned-to-me"
            checked={query.assignedToMe}
            onCheckedChange={(value) => apply({ assignedToMe: value === true })}
          />
          내 담당
        </label>

        <label
          htmlFor="requested-by-me"
          className="flex cursor-pointer items-center gap-1.5 text-xs text-fg"
        >
          <Checkbox
            id="requested-by-me"
            checked={query.requestedByMe}
            onCheckedChange={(value) => apply({ requestedByMe: value === true })}
          />
          내가 요청
        </label>

        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setKeyword('');
              router.push('/improvements');
            }}
          >
            <X aria-hidden="true" />
            초기화
          </Button>
        ) : null}
      </div>
    </div>
  );
}
