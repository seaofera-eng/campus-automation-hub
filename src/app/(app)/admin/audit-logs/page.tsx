import { CircleAlert, CircleCheck, FileClock } from 'lucide-react';
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
import { requirePermission } from '@/lib/auth/current-user';
import { guardPage } from '@/lib/auth/page-guard';
import { buildAuditHref, hasAuditFilter, parseAuditQuery } from '@/lib/validation/admin';
import type { AuditQueryInput } from '@/lib/validation/admin';
import { formatDateTime } from '@/lib/utils/datetime';

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseAuditQuery(await searchParams);

  // 권한 검사는 Suspense **밖**에서 한다.
  // 안에서 하면 응답 헤더가 먼저 나가 notFound() 가 404 대신 200 을 반환한다.
  // (DECISIONS.md 의 loading.tsx 문제와 같은 원인이다.)
  await guardPage(() => requirePermission('admin:auditLogs'));

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
        /* 걸어 둔 필터가 없는데 "필터를 해제해 보세요"라고 하면 사용자가
           있지도 않은 필터를 찾게 된다. 두 경우를 갈라서 안내한다. */
        hasAuditFilter(query) ? (
          <EmptyState
            icon={FileClock}
            title="조건에 맞는 기록이 없습니다"
            description="필터를 해제하거나 기간을 넓혀 보세요."
          />
        ) : (
          <EmptyState
            icon={FileClock}
            title="아직 기록된 작업이 없습니다"
            description="도구 상태 변경이나 권한 변경 같은 작업을 하면 여기에 남습니다."
          />
        )
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
                        {formatDateTime(log.createdAt)}
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
                        <Badge tone="success" icon={CircleCheck}>
                          성공
                        </Badge>
                      ) : (
                        <Badge tone="danger" icon={CircleAlert}>
                          실패
                        </Badge>
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
