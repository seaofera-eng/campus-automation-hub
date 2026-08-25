'use client';

import { Settings2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { changeAccountPermissionsAction, updateUserAction } from '@/actions/admin-actions';
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
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_DESCRIPTIONS,
  ACCOUNT_TYPE_LABELS,
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_DESCRIPTIONS,
  ADMIN_PERMISSION_LABELS,
} from '@/domain/authz/accounts';
import type { AccountType, AdminPermission } from '@/domain/authz/accounts';
import type { Department } from '@/domain/identity/types';

/**
 * 권한 변경.
 *
 * 계정 종류(이용자/관리자)와, 관리자라면 어떤 관리 권한을 줄지 함께 정한다.
 * 사유 입력을 필수로 받는다. 권한을 바꾸는 일이라 나중에 "왜 바꿨는지"를
 * 확인할 수 있어야 한다. 사유는 감사 로그에 그대로 남는다.
 */
export function ChangePermissionsDialog({
  userId,
  userName,
  currentAccountType,
  currentPermissions,
  isSelf,
}: {
  userId: string;
  userName: string;
  currentAccountType: AccountType;
  currentPermissions: readonly AdminPermission[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(currentAccountType);
  const [permissions, setPermissions] = useState<AdminPermission[]>([...currentPermissions]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function toggle(permission: AdminPermission, checked: boolean) {
    setPermissions((current) =>
      checked ? [...current, permission] : current.filter((value) => value !== permission),
    );
  }

  function changeAccountType(next: AccountType) {
    setAccountType(next);
    // 이용자로 내리면 권한도 함께 비운다. 서버도 같은 규칙으로 다시 검사한다.
    if (next === 'USER') setPermissions([]);
  }

  const unchanged =
    accountType === currentAccountType &&
    permissions.length === currentPermissions.length &&
    permissions.every((value) => currentPermissions.includes(value));

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await changeAccountPermissionsAction({
        userId,
        accountType,
        adminPermissions: permissions,
        reason,
      });
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
        <Button variant="ghost" size="sm" disabled={isSelf} aria-label={`${userName} 권한 변경`}>
          <ShieldCheck aria-hidden="true" />
          권한
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>권한 변경</DialogTitle>
          <DialogDescription>
            {userName} 님의 권한을 바꿉니다. 이용자는 누구나 수요를 올리고 도구를 만들 수 있습니다.
            관리 권한은 필요한 것만 골라 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="계정 종류" htmlFor="new-account-type" required>
            <NativeSelect
              id="new-account-type"
              value={accountType}
              onChange={(event) => changeAccountType(event.target.value as AccountType)}
            >
              {ACCOUNT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {ACCOUNT_TYPE_LABELS[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <p className="rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
            {ACCOUNT_TYPE_DESCRIPTIONS[accountType]}
          </p>

          {accountType === 'ADMIN' ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-fg">관리 권한</legend>
              <p className="text-xs text-fg-muted">
                하나 이상 골라 주세요. 고른 것만 할 수 있습니다.
              </p>
              {fieldErrors.adminPermissions ? (
                <p className="text-xs text-danger">{fieldErrors.adminPermissions}</p>
              ) : null}
              <div className="flex flex-col gap-2">
                {ADMIN_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={permissions.includes(permission)}
                      onCheckedChange={(checked) => toggle(permission, checked === true)}
                    />
                    <span>
                      <span className="font-medium text-fg">
                        {ADMIN_PERMISSION_LABELS[permission]}
                      </span>
                      <span className="block text-xs text-fg-muted">
                        {ADMIN_PERMISSION_DESCRIPTIONS[permission]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <Field
            label="변경 사유"
            htmlFor="permission-reason"
            required
            hint="감사 로그에 남습니다. 5자 이상 적어 주세요."
            error={fieldErrors.reason}
          >
            <Textarea
              {...fieldAria('permission-reason', 'hint', fieldErrors.reason)}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="예: 도구 검토 담당자로 지정"
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending || unchanged}>
            {pending ? '변경 중…' : '권한 변경'}
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
