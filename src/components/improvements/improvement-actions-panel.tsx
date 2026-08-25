'use client';

import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  assignImprovementAction,
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
import { Field, Input, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import type { ImprovementTransitionRule } from '@/domain/improvement/status-machine';
import type { ImprovementStatus } from '@/domain/improvement/types';

export function ImprovementActionsPanel({
  improvementId,
  transitions,
  canAssign,
  developers,
  currentAssigneeId,
  currentTargetDate,
}: {
  improvementId: string;
  transitions: readonly ImprovementTransitionRule[];
  canAssign: boolean;
  developers: readonly { id: string; name: string }[];
  currentAssigneeId: string | null;
  currentTargetDate: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>처리</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {message ? <Alert tone="danger">{message}</Alert> : null}

        {canAssign ? (
          <AssignDialog
            improvementId={improvementId}
            developers={developers}
            currentAssigneeId={currentAssigneeId}
            currentTargetDate={currentTargetDate}
            onError={setMessage}
          />
        ) : null}

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

function AssignDialog({
  improvementId,
  developers,
  currentAssigneeId,
  currentTargetDate,
  onError,
}: {
  improvementId: string;
  developers: readonly { id: string; name: string }[];
  currentAssigneeId: string | null;
  currentTargetDate: string | null;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [developerUserId, setDeveloperUserId] = useState(currentAssigneeId ?? '');
  const [targetCompletionDate, setTargetCompletionDate] = useState(currentTargetDate ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setFieldErrors({});
    startTransition(async () => {
      const result = await assignImprovementAction({
        improvementId,
        developerUserId,
        targetCompletionDate,
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      setFieldErrors(result.error.fields ?? {});
      onError(result.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <UserPlus aria-hidden="true" />
          {currentAssigneeId ? '담당자 변경' : '담당자 배정'}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>담당자 배정</DialogTitle>
          <DialogDescription>
            배정된 개발자는 이 요청의 처리 단계를 직접 진행할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="담당 개발자" htmlFor="assignee">
            <NativeSelect
              id="assignee"
              value={developerUserId}
              onChange={(event) => setDeveloperUserId(event.target.value)}
            >
              <option value="">배정하지 않음</option>
              {developers.map((developer) => (
                <option key={developer.id} value={developer.id}>
                  {developer.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="목표 완료일"
            htmlFor="target-date"
            error={fieldErrors.targetCompletionDate}
          >
            <Input
              {...fieldAria('target-date', undefined, fieldErrors.targetCompletionDate)}
              type="date"
              value={targetCompletionDate}
              onChange={(event) => setTargetCompletionDate(event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending}>
            {pending ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
