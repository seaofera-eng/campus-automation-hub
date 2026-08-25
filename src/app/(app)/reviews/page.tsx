import { ClipboardCheck, ClipboardList, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadReviewQueue } from '@/application/reviews/query';
import { ToolStatusBadge } from '@/components/common/status-badge';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { guardPage } from '@/lib/auth/page-guard';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: '검토 작업' };

function daysWaiting(since: string): number {
  const elapsed = Date.now() - new Date(since).getTime();
  return Math.max(0, Math.floor(elapsed / (1000 * 60 * 60 * 24)));
}

export default async function ReviewsPage() {
  const queue = await guardPage(loadReviewQueue);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">검토 작업</h1>
        <p className="mt-1 text-sm text-fg-muted">
          내가 맡은 건이 먼저, 그다음 아직 아무도 맡지 않은 건이 표시됩니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-primary/40 bg-primary-soft/30 p-4">
          <p className="text-sm text-fg-muted">내가 맡은 건</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{queue.mineCount}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">배정 대기</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{queue.unassignedCount}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">전체 검토 대상</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{queue.entries.length}</p>
        </div>
      </div>

      {queue.entries.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="검토할 도구가 없습니다"
          description="새로 등록 신청된 도구가 있으면 이곳에 표시됩니다."
          action={
            <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
              전체 도구 보기 →
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.entries.map((entry) => (
            <li
              key={entry.toolId}
              className={cn(
                'rounded-card border bg-surface p-4 transition-colors hover:border-primary/50',
                entry.isMine ? 'border-primary/40' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/reviews/${entry.toolId}`}
                      className="font-semibold text-fg hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <ToolStatusBadge status={entry.status} />
                    {entry.isMine ? <Badge tone="primary">내 담당</Badge> : null}
                    {entry.usesSensitiveData ? (
                      <Badge tone="danger" icon={Lock}>
                        민감정보
                      </Badge>
                    ) : null}
                    {!entry.hasRiskChecklist ? (
                      <Badge tone="warning" icon={ClipboardList}>
                        체크리스트 미작성
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-fg-muted">{entry.summary}</p>
                </div>

                <div className="shrink-0 text-right text-xs text-fg-subtle">
                  <p>{daysWaiting(entry.submittedAt)}일 경과</p>
                  <p>{entry.assigneeName ? `${entry.assigneeName} 담당` : '배정 대기'}</p>
                </div>
              </div>

              <dl className="mt-2 flex flex-wrap gap-x-4 text-xs text-fg-subtle">
                <div className="flex gap-1">
                  <dt>부서</dt>
                  <dd className="text-fg-muted">{entry.departmentName}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>카테고리</dt>
                  <dd className="text-fg-muted">{entry.categoryName}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>담당자</dt>
                  <dd className="text-fg-muted">{entry.ownerName}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
