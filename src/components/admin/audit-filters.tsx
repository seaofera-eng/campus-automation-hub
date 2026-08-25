'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input, NativeSelect } from '@/components/ui/field';
import { buildAuditHref } from '@/lib/validation/admin';
import type { AuditQueryInput } from '@/lib/validation/admin';

export function AuditFilters({
  query,
  actors,
  actionNames,
  targetTypes,
}: {
  query: AuditQueryInput;
  actors: readonly { id: string; name: string }[];
  actionNames: readonly string[];
  targetTypes: readonly string[];
}) {
  const router = useRouter();

  function apply(overrides: Partial<AuditQueryInput>) {
    router.push(buildAuditHref(query, { ...overrides, page: 1 }));
  }

  const activeCount =
    (query.action ? 1 : 0) +
    (query.actorUserId ? 1 : 0) +
    (query.targetType ? 1 : 0) +
    (query.from ? 1 : 0) +
    (query.to ? 1 : 0);

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="작업" htmlFor="audit-action">
          <NativeSelect
            id="audit-action"
            value={query.action}
            onChange={(event) => apply({ action: event.target.value })}
          >
            <option value="">전체</option>
            {actionNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="행위자" htmlFor="audit-actor">
          <NativeSelect
            id="audit-actor"
            value={query.actorUserId}
            onChange={(event) => apply({ actorUserId: event.target.value })}
          >
            <option value="">전체</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="대상 종류" htmlFor="audit-target">
          <NativeSelect
            id="audit-target"
            value={query.targetType}
            onChange={(event) => apply({ targetType: event.target.value })}
          >
            <option value="">전체</option>
            {targetTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="시작일" htmlFor="audit-from">
          <Input
            id="audit-from"
            type="date"
            value={query.from.slice(0, 10)}
            onChange={(event) => apply({ from: event.target.value })}
          />
        </Field>

        <Field label="종료일" htmlFor="audit-to">
          <Input
            id="audit-to"
            type="date"
            value={query.to.slice(0, 10)}
            onChange={(event) => apply({ to: event.target.value })}
          />
        </Field>
      </div>

      {activeCount > 0 ? (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/audit-logs')}
          >
            <X aria-hidden="true" />
            필터 초기화
          </Button>
        </div>
      ) : null}
    </div>
  );
}
