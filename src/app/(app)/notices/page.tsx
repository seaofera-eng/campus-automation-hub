import { Megaphone } from 'lucide-react';
import type { Metadata } from 'next';
import { listNotices } from '@/application/notices/manage';
import { NoticeEditor } from '@/components/notices/notice-editor';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '공지' };

/** 공지 목록 (리뷰 1절: "[공지게시판]도 생성해서 노출") */
export default async function NoticesPage() {
  const { notices, canManage } = await guardPage(listNotices);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-fg">공지</h1>
          <p className="mt-1 text-sm text-fg-muted">
            플랫폼을 쓰면서 알아 두면 좋은 것들입니다.
          </p>
        </div>
        {canManage ? <NoticeEditor /> : null}
      </div>

      {notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="아직 공지가 없습니다"
          description={
            canManage
              ? '알려야 할 것이 생기면 여기에 올려 주세요.'
              : '새 공지가 올라오면 여기에 표시됩니다.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {notices.map((notice) => (
            <li
              key={notice.id}
              className="rounded-card border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.pinned ? <Badge tone="primary">고정</Badge> : null}
                    {/* 내린 공지는 관리 권한자에게만 보인다. 지우지 않고 감춘다. */}
                    {!notice.isPublished ? <Badge tone="warning">내림</Badge> : null}
                    <h2 className="font-semibold text-fg">{notice.title}</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {notice.authorName} · {formatDateTime(notice.createdAt)}
                  </p>
                </div>
                {canManage ? <NoticeEditor notice={notice} /> : null}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{notice.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
