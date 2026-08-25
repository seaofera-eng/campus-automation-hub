'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteDepartmentAction, upsertDepartmentAction } from '@/actions/admin-actions';
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
import { Field, Input, NativeSelect, fieldAria } from '@/components/ui/field';
import type { Department } from '@/domain/identity/types';

export function DepartmentDialog({
  department,
  departments,
}: {
  /** 없으면 새로 추가하는 모드 */
  department: Department | null;
  departments: readonly Department[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(department?.name ?? '');
  const [code, setCode] = useState(department?.code ?? '');
  const [parentId, setParentId] = useState(department?.parentId ?? '');
  const [sortOrder, setSortOrder] = useState(String(department?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const isEdit = department !== null;

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await upsertDepartmentAction({
        departmentId: department?.id ?? '',
        name,
        code,
        parentId,
        sortOrder,
      });

      if (result.ok) {
        setOpen(false);
        if (!isEdit) {
          setName('');
          setCode('');
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
          <Button variant="ghost" size="sm" aria-label={`${department.name} 수정`}>
            <Pencil aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden="true" />
            부서 추가
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '부서 수정' : '부서 추가'}</DialogTitle>
          <DialogDescription>
            부서는 도구와 수요의 소속을 나타냅니다. 목록과 필터에 그대로 쓰입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="부서 이름" htmlFor="dept-name" required error={fieldErrors.name}>
            <Input
              {...fieldAria('dept-name', undefined, fieldErrors.name)}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
            />
          </Field>

          <Field
            label="부서 코드"
            htmlFor="dept-code"
            required
            hint="시스템 내부에서 부서를 구분하는 짧은 이름입니다."
            error={fieldErrors.code}
          >
            <Input
              {...fieldAria('dept-code', 'hint', fieldErrors.code)}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={40}
              placeholder="예: ACADEMIC"
            />
          </Field>

          <Field label="상위 부서" htmlFor="dept-parent">
            <NativeSelect
              id="dept-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">없음 (최상위)</option>
              {departments
                .filter((item) => item.id !== department?.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>

          <Field
            label="표시 순서"
            htmlFor="dept-order"
            hint="숫자가 작을수록 위에 표시됩니다."
            error={fieldErrors.sortOrder}
          >
            <Input
              {...fieldAria('dept-order', 'hint', fieldErrors.sortOrder)}
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </Field>
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

export function DeleteDepartmentButton({
  departmentId,
  name,
  memberCount,
  toolCount,
}: {
  departmentId: string;
  name: string;
  memberCount: number;
  toolCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const blocked = memberCount > 0 || toolCount > 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDepartmentAction({ departmentId });
      if (result.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      setError(result.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`${name} 삭제`} disabled={blocked}>
          <Trash2 aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>부서를 삭제할까요?</DialogTitle>
          <DialogDescription>
            &apos;{name}&apos; 부서를 목록에서 제거합니다. 기록은 남고 목록에만 보이지 않게 됩니다.
          </DialogDescription>
        </DialogHeader>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={submit} disabled={pending}>
            {pending ? '삭제 중…' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
