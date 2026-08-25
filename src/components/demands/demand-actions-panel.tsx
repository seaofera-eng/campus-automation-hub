'use client';

import { HandHeart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { joinDemandAction, transitionDemandAction } from '@/actions/demand-actions';
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
import type { DemandTransitionRule } from '@/domain/demand/status-machine';

export function DemandActionsPanel({
  demandId,
  transitions,
  canJoin,
  alreadyJoined,
}: {
  demandId: string;
  transitions: readonly DemandTransitionRule[];
  canJoin: boolean;
  alreadyJoined: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function transition(toStatus: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await transitionDemandAction({ demandId, toStatus, reason: '' });
      if (result.ok) {
        router.refresh();
        return;
      }
      setMessage({ tone: 'danger', text: result.error.message });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>이 수요에 대해</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {message ? (
          <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
        ) : null}

        {canJoin ? (
          <JoinDialog demandId={demandId} />
        ) : alreadyJoined ? (
          <Alert tone="success">이미 참여를 신청하셨습니다.</Alert>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-fg">상태 변경</h3>
          {transitions.length === 0 ? (
            <p className="text-sm text-fg-muted">
              지금 상태에서 실행할 수 있는 변경이 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((rule) => (
                <Button
                  key={`${rule.from}-${rule.to}`}
                  type="button"
                  size="sm"
                  variant={rule.destructive ? 'danger' : 'secondary'}
                  disabled={pending}
                  onClick={() => transition(rule.to)}
                >
                  {rule.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function JoinDialog({ demandId }: { demandId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await joinDemandAction({ demandId, message });
      if (result.ok) {
        setOpen(false);
        setMessage('');
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
        <Button type="button">
          <HandHeart aria-hidden="true" />
          개발 참여 신청
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>개발 참여 신청</DialogTitle>
          <DialogDescription>
            이 수요를 해결하는 데 어떻게 기여할 수 있는지 알려 주세요. 수요를 등록한 분에게
            전달됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field
            label="남기실 말"
            htmlFor="participant-message"
            hint="어떤 부분을 맡을 수 있는지 적어 주시면 좋습니다. 비워 두셔도 됩니다."
            error={fieldErrors.message}
          >
            <Textarea
              {...fieldAria('participant-message', 'hint', fieldErrors.message)}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
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
            {pending ? '신청 중…' : '참여 신청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
