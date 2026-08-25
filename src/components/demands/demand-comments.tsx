'use client';

import { MessageCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addDemandCommentAction, deleteDemandCommentAction } from '@/actions/demand-actions';
import { MemberTypeBadge } from '@/components/layout/account-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Textarea, fieldAria } from '@/components/ui/field';
import type { DemandCommentView } from '@/application/demands/comments';
import { formatDateTime } from '@/lib/utils/datetime';

/**
 * 수요 문의 (리뷰 6.4절).
 *
 * "참여 신청을 하지 않고 댓글만 다는 기능이 있었으면 좋겠음."
 *
 * 참여 신청 버튼과 나란히 두지 않고 아래에 따로 둔다. 물어보는 일과
 * 맡겠다고 손 드는 일은 무게가 다르다.
 */
export function DemandComments({
  demandId,
  comments,
}: {
  demandId: string;
  comments: readonly DemandCommentView[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await addDemandCommentAction({ demandId, body });
      if (result.ok) {
        setBody('');
        router.refresh();
        return;
      }
      setFieldErrors(result.error.fields ?? {});
      setError(result.error.message);
    });
  }

  function remove(commentId: string) {
    startTransition(async () => {
      const result = await deleteDemandCommentAction({ commentId });
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error.message);
    });
  }

  return (
    <section aria-labelledby="demand-comments-heading" className="flex flex-col gap-4">
      <h2 id="demand-comments-heading" className="flex items-center gap-2 font-semibold text-fg">
        <MessageCircle className="size-4 text-fg-subtle" aria-hidden="true" />
        문의 ({comments.length})
      </h2>

      <p className="text-sm text-fg-muted">
        참여를 신청하지 않아도 물어볼 수 있습니다. 궁금한 것을 먼저 확인하고 정하세요.
      </p>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {comments.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-4 text-sm text-fg-subtle">
          아직 문의가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-fg">{comment.authorName}</span>
                <MemberTypeBadge memberType={comment.authorMemberType} />
                <span className="ml-auto text-xs text-fg-subtle">
                  {formatDateTime(comment.createdAt)}
                </span>
                {comment.isMine ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => remove(comment.id)}
                    aria-label="내 문의 지우기"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <Field
        label="문의 남기기"
        htmlFor="demand-comment"
        hint="어떤 점이 궁금한지 적어 주세요. 수요를 올린 분에게 전달됩니다."
        error={fieldErrors.body}
      >
        <Textarea
          {...fieldAria('demand-comment', 'hint', fieldErrors.body)}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={2000}
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending || body.trim().length < 2}>
          {pending ? '올리는 중…' : '문의 남기기'}
        </Button>
      </div>
    </section>
  );
}
