'use client';

import { Link2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { linkToolAction, unlinkToolAction } from '@/actions/demand-actions';
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
import { Field, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import { MATCH_TYPES, MATCH_TYPE_LABELS } from '@/domain/demand/types';
import type { MatchType } from '@/domain/demand/types';

/**
 * 수요-도구 수동 연결 (요구사항 8번).
 *
 * ⚠️ 자동 추천이 아니다. 검토자가 목록에서 도구를 직접 고르고, 연결 유형을
 * 선택하고, 왜 그렇게 판단했는지 적는다. 유사도 점수 같은 값을 보여주지 않는다.
 */
export function MatchToolDialog({
  demandId,
  tools,
}: {
  demandId: string;
  tools: readonly { id: string; name: string; summary: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toolId, setToolId] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('READY_TO_USE');
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const selected = tools.find((tool) => tool.id === toolId);

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await linkToolAction({ demandId, toolId, matchType, rationale });
      if (result.ok) {
        setOpen(false);
        setToolId('');
        setRationale('');
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
        <Button size="sm" disabled={tools.length === 0}>
          <Link2 aria-hidden="true" />
          도구 연결
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>기존 도구 연결</DialogTitle>
          <DialogDescription>
            이 수요를 해결할 수 있는 도구를 직접 골라 연결합니다. 자동 추천이 아니라 검토자의
            판단으로 연결하는 것이므로, 판단 근거를 남겨 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="연결할 도구" htmlFor="match-tool" required error={fieldErrors.toolId}>
            <NativeSelect
              {...fieldAria('match-tool', undefined, fieldErrors.toolId)}
              value={toolId}
              onChange={(event) => setToolId(event.target.value)}
            >
              <option value="">선택해 주세요</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {selected ? (
            <p className="rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
              {selected.summary || '한 줄 소개가 없습니다.'}
            </p>
          ) : null}

          <Field label="연결 유형" htmlFor="match-type" required>
            <NativeSelect
              id="match-type"
              value={matchType}
              onChange={(event) => setMatchType(event.target.value as MatchType)}
            >
              {MATCH_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MATCH_TYPE_LABELS[type]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="연결 사유"
            htmlFor="match-rationale"
            required
            hint="이 도구가 왜 수요에 맞는지, 무엇을 더 해야 하는지 10자 이상 적어 주세요."
            error={fieldErrors.rationale}
          >
            <Textarea
              {...fieldAria('match-rationale', 'hint', fieldErrors.rationale)}
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
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
          <Button onClick={submit} disabled={pending || toolId === ''}>
            {pending ? '연결 중…' : '연결하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnlinkToolButton({
  demandId,
  matchId,
  toolName,
}: {
  demandId: string;
  matchId: string;
  toolName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await unlinkToolAction({ demandId, matchId });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`${toolName} 연결 해제`}>
          <Trash2 aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>연결을 해제할까요?</DialogTitle>
          <DialogDescription>
            &apos;{toolName}&apos; 연결을 해제합니다. 연결 사유도 함께 사라집니다.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={submit} disabled={pending}>
            {pending ? '해제 중…' : '연결 해제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
