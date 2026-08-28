'use client';

import { MessageSquarePlus, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addReviewCommentAction, assignReviewerAction } from '@/actions/review-actions';
import { StatusTransitionDialog } from '@/components/tools/status-transition-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Textarea, fieldAria } from '@/components/ui/field';
import type { TransitionRule } from '@/domain/tool/status-machine';

/**
 * 검토자 작업 패널 (리뷰 2026-08-28 5절 반영).
 *
 * 실행할 수 있는 상태 전환만 버튼으로 보여준다. 목록은 서버가
 * `availableTransitions()` 로 계산해 넘겨준다 — 화면이 스스로 판단하지 않는다.
 *
 * ## 의견 남기기를 접어 두는 이유
 *
 * "의견 남기기가 남용되고 있음. 계속 같은 내용을 물어 볼 필요가 없으므로
 *  '보완 요청'시에만 내용을 쓰도록 하는게 좋을 것 같음"
 *
 * 맞는 지적이다. 검토자가 할 말은 대개 **보완 요청 사유**이고, 그건 상태를
 * 바꿀 때 이미 적는다. 그런데 여기 빈 칸이 늘 펼쳐져 있으니 같은 말을 두 번
 * 적게 되고, 이력에 중복된 글이 쌓인다.
 *
 * 그래서 종류 고르기를 없애고 칸을 접었다. **정말 따로 남길 말이 있을 때만**
 * 열어서 쓴다. 종류는 `GENERAL` 하나로 고정한다 — 보완 요청과 승인 의견은
 * 상태 전환에 딸려 기록되므로 여기서 다시 고를 이유가 없다.
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

  const [commentOpen, setCommentOpen] = useState(false);
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
        // 보완 요청·승인 의견은 상태를 바꿀 때 함께 기록된다.
        // 여기 남기는 것은 그 밖의 메모다.
        kind: 'GENERAL',
        body: commentBody,
      });
      if (result.ok) {
        setCommentBody('');
        setCommentOpen(false);
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

      <CardContent className="flex flex-col gap-4">
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
                  requiresReason={rule.requiresReason}
                />
              ))}
            </div>
          )}
        </div>

        {/*
          의견은 접어 둔다.

          보완 요청 사유는 상태를 바꿀 때 이미 적는다. 빈 칸이 늘 펼쳐져 있으면
          같은 말을 두 번 적게 되고 이력에 중복된 글이 쌓인다.
        */}
        <div className="border-t border-border pt-4">
          {commentOpen ? (
            <div className="flex flex-col gap-3">
              <Field label="따로 남길 메모" htmlFor="comment-body" required error={commentError}>
                <Textarea
                  {...fieldAria('comment-body', 'hint', commentError)}
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="상태 변경 사유와 별개로 남길 내용이 있으면 적어 주세요."
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={submitComment}
                  disabled={pending || commentBody.trim().length < 5}
                >
                  <MessageSquarePlus aria-hidden="true" />
                  등록
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCommentOpen(false);
                    setCommentBody('');
                    setCommentError(undefined);
                  }}
                  disabled={pending}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCommentOpen(true)}
              >
                <MessageSquarePlus aria-hidden="true" />
                따로 메모 남기기
              </Button>
              <p className="mt-1.5 text-xs text-fg-subtle">
                보완 요청 사유는 상태를 바꿀 때 함께 적습니다. 여기는 그 밖의 메모입니다.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
