'use client';

import { Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { awardTokensAction } from '@/actions/reward-actions';
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

/**
 * 토큰 수여 (리뷰 6.4절).
 *
 * "완성된 도구 중에 마음에 드는 하나의 도구에 토큰을 수여할 수 있는 시스템"
 *
 * **한 수요에 한 번만** 준다. 되돌릴 수 없으므로 확인 문구를 분명히 둔다.
 */
export function AwardTokensPanel({
  demandId,
  offeredTokens,
  candidates,
}: {
  demandId: string;
  offeredTokens: number;
  /** 이 수요에 연결된 도구들 */
  candidates: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toolId, setToolId] = useState(candidates[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await awardTokensAction({ demandId, toolId, note });
      if (result.ok) {
        setOpen(false);
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
        <Button className="w-full">
          <Coins aria-hidden="true" />
          토큰 {offeredTokens.toLocaleString('ko-KR')} 수여하기
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>토큰 수여</DialogTitle>
          <DialogDescription>
            이 수요를 해결해 준 도구 하나를 골라 주세요. 한 번만 줄 수 있고 되돌릴 수
            없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          {candidates.length === 0 ? (
            <Alert tone="warning" title="연결된 도구가 없습니다">
              먼저 이 수요에 도구를 연결해야 토큰을 줄 수 있습니다.
            </Alert>
          ) : (
            <>
              <Field label="토큰을 줄 도구" htmlFor="award-tool" required error={fieldErrors.toolId}>
                <NativeSelect
                  id="award-tool"
                  value={toolId}
                  onChange={(event) => setToolId(event.target.value)}
                >
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                label="한 마디"
                htmlFor="award-note"
                required
                hint="어떤 점이 좋았는지 적어 주세요. 만든 사람이 읽습니다."
                error={fieldErrors.note}
              >
                <Textarea
                  {...fieldAria('award-note', 'hint', fieldErrors.note)}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </Field>

              <p className="rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
                <strong className="text-fg">{offeredTokens.toLocaleString('ko-KR')} 토큰</strong>이
                고른 도구를 만든 사람에게 갑니다.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={pending || candidates.length === 0 || note.trim().length < 5}
          >
            {pending ? '수여 중…' : '수여'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
