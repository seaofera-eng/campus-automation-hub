'use client';

import { Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveNoticeAction } from '@/actions/notice-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Field, Input, Textarea, fieldAria } from '@/components/ui/field';
import type { Notice } from '@/domain/notice/types';

/**
 * 공지 쓰기·고치기 (리뷰 1절).
 *
 * 내리기는 삭제가 아니다. 목록에서 감출 뿐 기록은 남는다 —
 * 무엇을 공지했는지는 나중에 확인할 수 있어야 한다.
 */
export function NoticeEditor({ notice }: { notice?: Notice }) {
  const router = useRouter();
  const isEdit = notice !== undefined;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [pinned, setPinned] = useState(notice?.pinned ?? false);
  const [isPublished, setIsPublished] = useState(notice?.isPublished ?? true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await saveNoticeAction({
        noticeId: notice?.id ?? '',
        title,
        body,
        pinned,
        isPublished,
      });
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
        <Button variant={isEdit ? 'ghost' : 'primary'} size={isEdit ? 'sm' : 'md'}>
          {isEdit ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {isEdit ? '수정' : '공지 쓰기'}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '공지 수정' : '새 공지'}</DialogTitle>
          <DialogDescription>
            모든 이용자가 보는 글입니다. 홈 화면 위쪽에도 표시됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="제목" htmlFor="notice-title" required error={fieldErrors.title}>
            <Input
              {...fieldAria('notice-title', undefined, fieldErrors.title)}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
            />
          </Field>

          <Field label="내용" htmlFor="notice-body" required error={fieldErrors.body}>
            <Textarea
              {...fieldAria('notice-body', undefined, fieldErrors.body)}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              maxLength={5000}
            />
          </Field>

          <label
            htmlFor="notice-pinned"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm"
          >
            <Checkbox
              id="notice-pinned"
              checked={pinned}
              onCheckedChange={(value) => setPinned(value === true)}
            />
            <span>
              <span className="block font-medium text-fg">위에 고정</span>
              <span className="block text-xs text-fg-muted">
                홈 화면에서 먼저 보입니다. 전부 고정하면 고정의 뜻이 없어집니다.
              </span>
            </span>
          </label>

          <label
            htmlFor="notice-published"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm"
          >
            <Checkbox
              id="notice-published"
              checked={isPublished}
              onCheckedChange={(value) => setIsPublished(value === true)}
            />
            <span>
              <span className="block font-medium text-fg">올리기</span>
              <span className="block text-xs text-fg-muted">
                체크를 풀면 목록에서 감춥니다. 지우지는 않습니다.
              </span>
            </span>
          </label>
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
