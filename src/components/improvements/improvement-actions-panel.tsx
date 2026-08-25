'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  transitionImprovementAction,
} from '@/actions/improvement-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ImprovementTransitionRule } from '@/domain/improvement/status-machine';
import type { ImprovementStatus } from '@/domain/improvement/types';

export function ImprovementActionsPanel({
  improvementId,
  transitions,
}: {
  improvementId: string;
  transitions: readonly ImprovementTransitionRule[];
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>처리</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {message ? <Alert tone="danger">{message}</Alert> : null}


        <div>
          <h3 className="mb-2 text-sm font-semibold text-fg">상태 변경</h3>
          {transitions.length === 0 ? (
            <p className="text-sm text-fg-muted">
              지금 상태에서 실행할 수 있는 변경이 없습니다. 담당자로 배정되면 처리를 진행할 수
              있습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((rule) => (
                <TransitionDialog
                  key={`${rule.from}-${rule.to}`}
                  improvementId={improvementId}
                  toStatus={rule.to}
                  label={rule.label}
                  destructive={rule.destructive}
                  onError={setMessage}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TransitionDialog({
  improvementId,
  toStatus,
  label,
  destructive,
  onError,
}: {
  improvementId: string;
  toStatus: ImprovementStatus;
  label: string;
  destructive: boolean;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await transitionImprovementAction({ improvementId, toStatus, comment });
      if (result.ok) {
        setOpen(false);
        setComment('');
        router.refresh();
        return;
      }
      onError(result.error.message);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={destructive ? 'danger' : 'secondary'}>
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            처리 의견을 남기면 요청자에게 전달되고 이력에 남습니다.
          </DialogDescription>
        </DialogHeader>

        <Field
          label="처리 의견"
          htmlFor={`comment-${toStatus}`}
          hint="선택 사항이지만, 특히 반려할 때는 이유를 적어 주세요."
        >
          <Textarea
            {...fieldAria(`comment-${toStatus}`, 'hint')}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
          />
        </Field>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={submit} disabled={pending}>
            {pending ? '처리 중…' : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
