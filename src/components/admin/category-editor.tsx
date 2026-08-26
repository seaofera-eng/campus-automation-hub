'use client';

import { Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { upsertCategoryAction } from '@/actions/admin-actions';
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
import type { ToolCategory } from '@/domain/tool/types';

export function CategoryDialog({
  category,
  toolCount,
}: {
  category: ToolCategory | null;
  toolCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? '');
  const [code, setCode] = useState(category?.code ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const isEdit = category !== null;

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await upsertCategoryAction({
        categoryId: category?.id ?? '',
        name,
        code,
        description,
        sortOrder,
        isActive,
      });

      if (result.ok) {
        setOpen(false);
        if (!isEdit) {
          setName('');
          setCode('');
          setDescription('');
        }
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
        {isEdit ? (
          <Button variant="ghost" size="sm" aria-label={`${category.name} 수정`}>
            <Pencil aria-hidden="true" />
            수정
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden="true" />
            카테고리 추가
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '카테고리 수정' : '카테고리 추가'}</DialogTitle>
          <DialogDescription>
            도구 등록 화면의 선택지와 목록 필터에 쓰입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="카테고리 이름" htmlFor="cat-name" required error={fieldErrors.name}>
            <Input
              {...fieldAria('cat-name', undefined, fieldErrors.name)}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
            />
          </Field>

          <Field label="코드" htmlFor="cat-code" required error={fieldErrors.code}>
            <Input
              {...fieldAria('cat-code', undefined, fieldErrors.code)}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={40}
              placeholder="예: DOCUMENT"
            />
          </Field>

          <Field label="설명" htmlFor="cat-description" error={fieldErrors.description}>
            <Textarea
              {...fieldAria('cat-description', undefined, fieldErrors.description)}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={300}
            />
          </Field>

          <Field label="표시 순서" htmlFor="cat-order" error={fieldErrors.sortOrder}>
            <Input
              {...fieldAria('cat-order', undefined, fieldErrors.sortOrder)}
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </Field>

          <label
            htmlFor="cat-active"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm"
          >
            <Checkbox
              id="cat-active"
              checked={isActive}
              onCheckedChange={(value) => setIsActive(value === true)}
            />
            <span>
              <span className="block font-medium text-fg">사용 중</span>
              <span className="block text-xs text-fg-muted">
                해제하면 새 도구를 등록할 때 이 카테고리를 고를 수 없습니다.
              </span>
            </span>
          </label>

          {/* 쓰이는 중인 카테고리를 내리려 할 때만 알린다.
              평소에도 늘 떠 있으면 읽지 않게 된다. */}
          {isEdit && !isActive && (toolCount ?? 0) > 0 ? (
            <Alert tone="warning" title={`이 카테고리로 등록된 도구가 ${toolCount}건 있습니다`}>
              그 도구들은 그대로 남고 분류도 유지됩니다. 다만 목록 필터에서 이 카테고리가
              빠지므로 찾기 어려워질 수 있습니다.
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending || name.trim() === '' || code.trim() === ''}>
            {pending ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
