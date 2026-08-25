'use client';

import { MessageSquarePlus, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addReviewCommentAction, assignReviewerAction } from '@/actions/review-actions';
import { StatusTransitionDialog } from '@/components/tools/status-transition-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import { REVIEW_COMMENT_KINDS, REVIEW_COMMENT_KIND_LABELS } from '@/domain/review/types';
import type { ReviewCommentKind } from '@/domain/review/types';
import type { TransitionRule } from '@/domain/tool/status-machine';

/**
 * 검토자 작업 패널.
 *
 * 실행할 수 있는 상태 전환만 버튼으로 보여준다. 목록은 서버가
 * `availableTransitions()` 로 계산해 넘겨준다 — 화면이 스스로 판단하지 않는다.
 */
export function ReviewActionsPanel({
  toolId,
  transitions,
  canAssignSelf,
  hasChecklist,
}: {
  toolId: string;
  transitions: readonly TransitionRule[];
  canAssignSelf: boolean;
  hasChecklist: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const [commentKind, setCommentKind] = useState<ReviewCommentKind>('GENERAL');
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>();

  function takeAssignment() {
    setMessage(null);
    startTransition(async () => {
      const result = await assignReviewerAction({ toolId, reviewerUserId: '' });
      if (result.ok) {
        setMessage({ tone: 'success', text: '이 도구의 검토를 맡았습니다.' });
        router.refresh();
        return;
      }
      setMessage({ tone: 'danger', text: result.error.message });
    });
  }

  function submitComment() {
    setMessage(null);
    setCommentError(undefined);

    startTransition(async () => {
      const result = await addReviewCommentAction({
        toolId,
        kind: commentKind,
        body: commentBody,
      });
      if (result.ok) {
        setCommentBody('');
        setMessage({ tone: 'success', text: '검토 의견을 등록했습니다.' });
        router.refresh();
        return;
      }
      setCommentError(result.error.fields?.body);
      setMessage({ tone: 'danger', text: result.error.message });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>검토 작업</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {message ? (
          <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
        ) : null}

        {canAssignSelf ? (
          <Button type="button" variant="secondary" onClick={takeAssignment} disabled={pending}>
            <UserCheck aria-hidden="true" />
            {pending ? '처리 중…' : '이 도구 검토 맡기'}
          </Button>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-fg">상태 변경</h3>
          {transitions.length === 0 ? (
            <p className="text-sm text-fg-muted">
              지금 상태에서 실행할 수 있는 변경이 없습니다.
              {!hasChecklist
                ? ' 시범운영으로 넘기려면 위험 체크리스트를 먼저 저장해 주세요.'
                : ''}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((rule) => (
                <StatusTransitionDialog
                  key={`${rule.from}-${rule.to}`}
                  toolId={toolId}
                  toStatus={rule.to}
                  label={rule.label}
                  destructive={rule.destructive}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">검토 의견 남기기</h3>
          <div className="flex flex-col gap-3">
            <Field label="의견 종류" htmlFor="comment-kind">
              <NativeSelect
                id="comment-kind"
                value={commentKind}
                onChange={(event) => setCommentKind(event.target.value as ReviewCommentKind)}
              >
                {REVIEW_COMMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {REVIEW_COMMENT_KIND_LABELS[kind]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="내용" htmlFor="comment-body" required error={commentError}>
              <Textarea
                {...fieldAria('comment-body', undefined, commentError)}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={4}
                placeholder="무엇을 확인했고 무엇을 보완해야 하는지 구체적으로 적어 주세요."
              />
            </Field>

            <Button
              type="button"
              variant="secondary"
              onClick={submitComment}
              disabled={pending || commentBody.trim().length < 5}
            >
              <MessageSquarePlus aria-hidden="true" />
              의견 등록
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
