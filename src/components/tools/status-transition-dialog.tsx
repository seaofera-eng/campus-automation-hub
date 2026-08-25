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
 * 상태 전환 대화상자 (요구사항 7번·12번).
 *
 * 이유 입력이 필수다. 되돌리기 어려운 동작(사용 중지·폐기)은 빨간 버튼과
 * 별도 경고 문구로 구분한다. 여기서 막는 것은 사용자의 실수이고,
 * 권한과 전환 규칙은 서버가 다시 판단한다.
 */
export function StatusTransitionDialog({
  toolId,
  toStatus,
  label,
  destructive,
}: {
  toolId: string;
  toStatus: ToolStatus;
  label: string;
  destructive: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={destructive ? 'danger' : 'primary'} size="sm">
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
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={submit}
            disabled={pending}
          >
            {pending ? '처리 중…' : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
