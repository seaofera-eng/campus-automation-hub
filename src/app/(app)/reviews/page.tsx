import { ClipboardCheck, ClipboardList, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  REVIEW_STAGES,
  REVIEW_STAGE_LABELS,
  loadReviewQueue,
} from '@/application/reviews/query';
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

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const queue = await guardPage(loadReviewQueue);

  const raw = (await searchParams).stage;
  const selected = REVIEW_STAGES.find((stage) => stage === (Array.isArray(raw) ? raw[0] : raw));
  const entries = selected ? queue.entries.filter((entry) => entry.stage === selected) : queue.entries;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">검토 작업</h1>
        <p className="mt-1 text-sm text-fg-muted">
          미검토 → 검토 중 → 수정 보완 → 검토 완료 순으로 표시됩니다. 같은 칸에서는 오래
          기다린 것부터입니다.
        </p>
      </div>

      {/* 칸을 눌러 그 칸만 볼 수 있다 (리뷰 5.1절). 주소에 남으므로 공유·새로고침에 견딘다. */}
      <nav aria-label="검토 단계" className="flex flex-wrap gap-2">
        <StageButton href="/reviews" active={!selected} label="전체" count={queue.entries.length} />
        {REVIEW_STAGES.map((stage) => (
          <StageButton
            key={stage}
            href={`/reviews?stage=${stage}`}
            active={selected === stage}
            label={REVIEW_STAGE_LABELS[stage]}
            count={queue.stageCounts[stage]}
          />
        ))}
      </nav>

      {queue.mineCount > 0 ? (
        <p className="text-sm text-fg-muted">
          이 중 <strong className="font-semibold text-fg">{queue.mineCount}건</strong>은 내가 맡은
          건입니다. 아직 아무도 맡지 않은 건은 {queue.unassignedCount}건입니다.
        </p>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={selected ? `'${REVIEW_STAGE_LABELS[selected]}' 칸이 비어 있습니다` : '검토할 도구가 없습니다'}
          description={
            selected
              ? '다른 칸을 눌러 보세요.'
              : '새로 등록 신청된 도구가 있으면 이곳에 표시됩니다.'
          }
          action={
            <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
              전체 도구 보기 →
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
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
                  <dt>만든 사람</dt>
                  <dd className="text-fg-muted">{entry.ownerName}</dd>
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

/** 검토 단계 버튼 하나 */
function StageButton({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border text-fg-muted hover:bg-surface-muted hover:text-fg',
      )}
    >
      {label}
      <span className="tabular-nums text-xs">{count}</span>
    </Link>
  );
}
