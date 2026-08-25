'use client';

import { Settings2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { changeUserRoleAction, updateUserAction } from '@/actions/admin-actions';
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
import { Field, Input, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import { USER_ROLES, USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS } from '@/domain/authz/roles';
import type { UserRole } from '@/domain/authz/roles';
import type { Department } from '@/domain/identity/types';

/**
 * 역할 변경.
 *
 * 사유 입력을 필수로 받는다. 권한을 바꾸는 일이라 나중에 "왜 바꿨는지"를
 * 확인할 수 있어야 한다. 사유는 감사 로그에 그대로 남는다.
 */
export function ChangeRoleDialog({
  userId,
  userName,
  currentRole,
  isSelf,
}: {
  userId: string;
  userName: string;
  currentRole: UserRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(currentRole);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await changeUserRoleAction({ userId, role, reason });
      if (result.ok) {
        setOpen(false);
        setReason('');
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
        <Button variant="ghost" size="sm" disabled={isSelf} aria-label={`${userName} 역할 변경`}>
          <ShieldCheck aria-hidden="true" />
          역할
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>역할 변경</DialogTitle>
          <DialogDescription>
            {userName} 님의 역할을 바꿉니다. 역할에 따라 할 수 있는 작업이 달라집니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="역할" htmlFor="new-role" required>
            <NativeSelect
              id="new-role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {USER_ROLES.map((value) => (
                <option key={value} value={value}>
                  {USER_ROLE_LABELS[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <p className="rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
            {USER_ROLE_DESCRIPTIONS[role]}
          </p>

          <Field
            label="변경 사유"
            htmlFor="role-reason"
            required
            hint="감사 로그에 남습니다. 5자 이상 적어 주세요."
            error={fieldErrors.reason}
          >
            <Textarea
              {...fieldAria('role-reason', 'hint', fieldErrors.reason)}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="예: 학사관리과 자동화 담당자로 지정"
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending || role === currentRole}>
            {pending ? '변경 중…' : '역할 변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  userId,
  userName,
  departments,
  currentDepartmentId,
  currentTitle,
  currentIsActive,
  isSelf,
}: {
  userId: string;
  userName: string;
  departments: readonly Department[];
  currentDepartmentId: string | null;
  currentTitle: string;
  currentIsActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState(currentDepartmentId ?? '');
  const [title, setTitle] = useState(currentTitle);
  const [isActive, setIsActive] = useState(currentIsActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserAction({ userId, departmentId, title, isActive });
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
        <Button variant="ghost" size="sm" aria-label={`${userName} 정보 수정`}>
          <Settings2 aria-hidden="true" />
          정보
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>사용자 정보 수정</DialogTitle>
          <DialogDescription>{userName} 님의 소속과 직위를 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="소속 부서" htmlFor="user-department">
            <NativeSelect
              id="user-department"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">소속 없음</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="직위" htmlFor="user-title">
            <Input
              id="user-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
            />
          </Field>

          <label
            htmlFor="user-active"
            className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm"
          >
            <Checkbox
              id="user-active"
              checked={isActive}
              disabled={isSelf}
              onCheckedChange={(value) => setIsActive(value === true)}
            />
            <span>
              <span className="block font-medium text-fg">계정 활성</span>
              <span className="block text-xs text-fg-muted">
                {isSelf
                  ? '자신의 계정은 비활성화할 수 없습니다.'
                  : '해제하면 이 사용자는 로그인할 수 없습니다.'}
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
