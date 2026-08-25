import { FileClock } from 'lucide-react';
import { Suspense } from 'react';
import { listAuditLogs } from '@/application/admin/audit';
import { AuditFilters } from '@/components/admin/audit-filters';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import { guardPage } from '@/lib/auth/page-guard';
import { buildAuditHref, parseAuditQuery } from '@/lib/validation/admin';
import type { AuditQueryInput } from '@/lib/validation/admin';

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseAuditQuery(await searchParams);

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info" title="감사 로그에는 값이 아니라 '무엇이 바뀌었는지'만 남습니다">
        개인정보나 상담 내용이 로그로 새어 나가지 않도록, 기록 시점에 필드 이름만 남기고 값은
        저장하지 않습니다. 관리자 작업도 예외 없이 기록됩니다.
      </Alert>

      <Suspense key={JSON.stringify(query)} fallback={<Skeleton className="h-96" />}>
        <AuditLogSection query={query} />
      </Suspense>
    </div>
  );
}

async function AuditLogSection({ query }: { query: AuditQueryInput }) {
  const { page, actors, actionNames, targetTypes } = await guardPage(() => listAuditLogs(query));

  return (
    <div className="flex flex-col gap-4">
      <AuditFilters
        query={query}
        actors={actors}
        actionNames={actionNames}
        targetTypes={targetTypes}
      />

      {page.items.length === 0 ? (
        <EmptyState
          icon={FileClock}
          title="조건에 맞는 기록이 없습니다"
          description="필터를 해제하거나 기간을 넓혀 보세요."
        />
      ) : (
        <>
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>일시</TableHeaderCell>
                  <TableHeaderCell>행위자</TableHeaderCell>
                  <TableHeaderCell>작업</TableHeaderCell>
                  <TableHeaderCell>대상</TableHeaderCell>
                  <TableHeaderCell>바뀐 항목</TableHeaderCell>
                  <TableHeaderCell>결과</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {page.items.map(({ log, actorName }) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-fg-muted">
                      <time dateTime={log.createdAt}>
                        {new Date(log.createdAt).toLocaleString('ko-KR', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </time>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {actorName}
                      {log.actorRole ? (
                        <span className="block text-xs text-fg-subtle">{log.actorRole}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">
                        {log.action}
                      </code>
                      {log.summary ? (
                        <p className="mt-1 text-xs text-fg-muted">{log.summary}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-fg-muted">
                      {log.targetType}
                      {log.targetId ? (
                        <span className="block font-mono text-[11px] text-fg-subtle">
                          {log.targetId.slice(0, 8)}…
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {log.changedFields.length === 0 ? '—' : log.changedFields.join(', ')}
                    </TableCell>
                    <TableCell>
                      {log.outcome === 'SUCCESS' ? (
                        <span className="text-sm text-fg-muted">성공</span>
                      ) : (
                        <Badge tone="danger">실패</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>

          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            totalItems={page.totalItems}
            buildHref={(target) => buildAuditHref(query, { page: target })}
          />
        </>
      )}
    </div>
  );
}
