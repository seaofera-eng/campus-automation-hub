'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/field';
import { deleteDemandAction } from '@/actions/demand-actions';
import { deleteToolAction } from '@/actions/tool-actions';
import { josa } from '@/domain/shared/josa';

/**
 * 내가 올린 것을 지운다 (리뷰 2026-08-30).
 *
 * "자기가 올린 수요나 도구를 삭제할 수 있는 기능을 넣을 수 없을까?"
 *
 * 도구와 수요가 같은 창을 쓴다. 두 개를 따로 만들면 한쪽만 고쳐지는 일이 생긴다.
 *
 * ## 이름을 받아 적게 한다
 *
 * 되돌릴 수 없는 동작이라 확인 버튼 하나로는 부족하다. 그렇다고 "정말입니까"를
 * 두 번 묻는 것은 성가시기만 하고 아무것도 막지 못한다 — 사람은 확인 창을
 * 읽지 않고 누른다.
 *
 * **이름을 그대로 적게 하면 무엇을 지우는지 한 번은 보게 된다.** 목록에서
 * 엉뚱한 줄을 눌렀을 때 여기서 걸린다.
 *
 * ## 지운 뒤에는 목록으로 보낸다
 *
 * 지운 것의 상세 화면에 그대로 두면 404 를 보게 된다. 무엇이 일어났는지
 * 모르는 채로 오류 화면을 만나는 것보다, 목록으로 돌려보내는 편이 낫다.
 */
export function DeleteEntityButton({
  kind,
  id,
  name,
  blockedReason,
  effects,
}: {
  /**
   * 무엇을 지우는가.
   *
   * 서버 컴포넌트에서 클라이언트로 **함수를 넘길 수 없어서** 콜백 대신 종류를
   * 받는다. 서버 액션 참조는 이 파일 안에서 고른다.
   */
  kind: 'tool' | 'demand';
  id: string;
  /** 지울 대상의 이름. 확인 입력과 대조한다. */
  name: string;
  /**
   * 지금은 지울 수 없는 이유. `null` 이면 지울 수 있다.
   *
   * 버튼을 감추지 않고 **왜 안 되는지 보여 준다.** 감추면 "삭제가 없는 서비스"로
   * 보이고, 실제로 지난 리뷰에서 그렇게 읽혔다.
   */
  blockedReason: string | null;
  /** 지우면 무엇이 함께 일어나는지. 창에 목록으로 보여 준다. */
  effects: readonly string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const entityLabel = kind === 'tool' ? '도구' : '업무 수요';
  const listPath = kind === 'tool' ? '/tools' : '/demands';
  const nameMatches = typed.trim() === name.trim();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result =
        kind === 'tool'
          ? await deleteToolAction({ toolId: id })
          : await deleteDemandAction({ demandId: id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOpen(false);
      router.push(listPath);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTyped('');
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 aria-hidden="true" />
          삭제
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entityLabel} 삭제</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>

        {blockedReason ? (
          <Alert tone="warning" title="지금은 지울 수 없습니다">
            {blockedReason}
          </Alert>
        ) : (
          <div className="flex flex-col gap-4">
            <Alert tone="danger" title="되돌릴 수 없습니다">
              지우면 목록과 검색에서 사라집니다. 화면에서 되살릴 방법은 없습니다.
            </Alert>

            <ul className="flex flex-col gap-1.5 rounded-card border border-border bg-surface-muted p-3 text-sm text-fg-muted">
              {effects.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>

            <div>
              <label htmlFor="delete-confirm" className="text-sm font-medium text-fg">
                확인을 위해 <strong className="font-semibold">{name}</strong>
                {josa(name, '을를')} 그대로 적어 주세요
              </label>
              <Input
                id="delete-confirm"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="mt-1.5"
                autoComplete="off"
                placeholder={name}
              />
            </div>

            {error ? <Alert tone="danger">{error}</Alert> : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            {blockedReason ? '닫기' : '취소'}
          </Button>
          {blockedReason ? null : (
            <Button variant="danger" onClick={submit} disabled={pending || !nameMatches}>
              <Trash2 aria-hidden="true" />
              {pending ? '지우는 중…' : '삭제'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
