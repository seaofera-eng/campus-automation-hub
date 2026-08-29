'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { transitionToolStatusAction } from '@/actions/review-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, Textarea, fieldAria } from '@/components/ui/field';
import type { ToolStatus } from '@/domain/tool/types';
import { TOOL_STATUS_DESCRIPTIONS, TOOL_STATUS_LABELS } from '@/domain/tool/types';

/**
 * 상태 전환 (요구사항 7번·12번 · 리뷰 2026-08-28 5절).
 *
 * ## 이유를 묻는 전환과 묻지 않는 전환
 *
 * "검토시작을 누르면 별도로 뜨는 창이 필요가 없음."
 *
 * 맞는 지적이다. **검토 시작은 판단이 아니라 착수다.** 적을 말이 없는데
 * 창을 띄우면 매번 "확인하겠습니다"를 치게 되고, 그러면 그 칸이 의미를 잃는다.
 * 정작 이유가 중요한 보완 요청·사용 중지에서도 대충 적게 된다.
 *
 * 그래서 `requiresReason` 이 꺼진 전환은 **창 없이 바로 실행한다.**
 * 이력에는 서버가 기본 문구를 남기므로 요구사항 7번은 그대로 지켜진다.
 *
 * 되돌리기 어려운 동작(사용 중지·폐기)은 빨간 버튼과 별도 경고로 구분한다.
 * 여기서 막는 것은 사용자의 실수이고, 권한과 전환 규칙은 서버가 다시 판단한다.
 */
export function StatusTransitionDialog({
  toolId,
  toStatus,
  label,
  destructive,
  requiresReason = true,
  variant,
}: {
  toolId: string;
  toStatus: ToolStatus;
  label: string;
  destructive: boolean;
  /** 왜 바꾸는지 물어야 하는가. 끄면 눌렀을 때 바로 실행한다. */
  requiresReason?: boolean;
  /**
   * 버튼 모양을 강제한다.
   *
   * 기본값은 되돌리기 어려우면 빨간색, 아니면 강조색이다. 그런데 나란히
   * 놓이는 선택지가 둘이면 둘 다 강조색이 되어 어느 쪽이 진행이고 어느 쪽이
   * 되돌리기인지 구분이 안 된다. 부르는 쪽에서 갈라 준다.
   */
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const buttonVariant = variant ?? (destructive ? 'danger' : 'primary');

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await transitionToolStatusAction({
        toolId,
        toStatus,
        reason,
        reviewComment,
      });

      if (result.ok) {
        setOpen(false);
        setReason('');
        setReviewComment('');
        router.refresh();
        return;
      }
      setFieldErrors(result.error.fields ?? {});
      setError(result.error.message);
    });
  }

  /*
   * 이유를 안 받는 전환은 버튼 하나로 끝낸다.
   *
   * 실패하면 버튼 아래에 문구를 띄운다 — 창이 없으니 알릴 곳이 여기뿐이다.
   */
  if (!requiresReason) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button variant={buttonVariant} size="sm" onClick={submit} disabled={pending}>
          {pending ? '처리 중…' : label}
        </Button>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm">
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            상태를 &apos;{TOOL_STATUS_LABELS[toStatus]}&apos;(으)로 바꿉니다.{' '}
            {TOOL_STATUS_DESCRIPTIONS[toStatus]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {destructive ? (
            <Alert tone="danger" title="되돌리기 어려운 작업입니다">
              이 변경은 사용자에게 바로 보입니다. 사유는 활동 이력에 영구히 남습니다.
            </Alert>
          ) : null}

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field
            label="변경 이유"
            htmlFor="transition-reason"
            required
            hint="왜 상태를 바꾸는지 5자 이상 적어 주세요. 활동 이력에 남습니다."
            error={fieldErrors.reason}
          >
            <Textarea
              {...fieldAria('transition-reason', 'hint', fieldErrors.reason)}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              autoFocus
            />
          </Field>

          <Field
            label="검토 의견"
            htmlFor="transition-comment"
            hint="담당자에게 전달할 내용이 있으면 적어 주세요. (선택)"
            error={fieldErrors.reviewComment}
          >
            <Textarea
              {...fieldAria('transition-comment', 'hint', fieldErrors.reviewComment)}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              rows={3}
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button variant={buttonVariant} onClick={submit} disabled={pending}>
            {pending ? '처리 중…' : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
