'use client';

import { GitBranch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { startNewVersionAction } from '@/actions/tool-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * 검토를 통과한 도구를 고치기 시작한다 (리뷰 2026-08-27 3절).
 *
 * "자동화 도구를 올렸으면 수정을 할 수가 없음."
 *
 * ## 왜 확인을 받는가
 *
 * 누르면 도구가 **목록에서 내려간다.** 임시저장으로 돌아가 다시 검토를 받아야
 * 하기 때문이다. 되돌리기 어려운 동작이라 무엇이 일어나는지 먼저 알린다.
 *
 * 지금 쓰는 사람이 있는 도구라면 더 그렇다.
 */
export function NewVersionButton({
  toolId,
  toolName,
  statusLabel,
}: {
  toolId: string;
  toolName: string;
  /** 지금 상태. "정식 승인된 도구가 내려갑니다"를 정확히 쓰기 위해 받는다. */
  statusLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startNewVersionAction({ toolId });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOpen(false);
      router.push(`/tools/${toolId}/edit`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <GitBranch aria-hidden="true" />
          내용 수정
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 버전을 만들어 수정합니다</DialogTitle>
          <DialogDescription>
            {toolName} 의 사본을 만들어 수정 화면으로 갑니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-fg-muted">
          <p>
            지금 내용을 바로 고칠 수는 없습니다. 검토를 통과한 뒤에 내용이 바뀌면 검토가
            무의미해지기 때문입니다.
          </p>

          <ul className="flex flex-col gap-1.5 rounded-card border border-border bg-surface-muted p-3">
            <li>
              · <strong className="font-semibold text-fg">{statusLabel}</strong> 상태가
              임시저장으로 돌아갑니다. 그동안 목록에서 내려갑니다
            </li>
            <li>· 사용 설명서와 프로그램 파일은 그대로 따라옵니다</li>
            <li>· 지금까지 받은 평가는 이전 버전에 남습니다</li>
            <li>· 고친 뒤 다시 등록 신청을 하면 검토를 새로 받습니다</li>
          </ul>

          {error ? <p className="text-danger">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={start} disabled={pending}>
            {pending ? '만드는 중…' : '새 버전 만들기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
