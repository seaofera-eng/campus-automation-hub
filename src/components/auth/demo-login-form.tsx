'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { signInDemoAction } from '@/actions/auth-actions';
import type { LoginOption } from '@/application/shared/login-options';
import { RoleBadge } from '@/components/layout/role-badge';
import { Alert } from '@/components/ui/alert';
import { USER_ROLE_DESCRIPTIONS } from '@/domain/authz/roles';
import { cn } from '@/lib/utils/cn';

/**
 * DEMO 모드 로그인.
 *
 * 비밀번호가 없다. 역할별 데모 계정을 골라 그 사람의 화면을 둘러보는 용도다.
 * 실제 인증을 흉내 내지 않는다는 점을 화면에도 적어 둔다.
 */
export function DemoLoginForm({ accounts }: { accounts: readonly LoginOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(id: string) {
    setSelectedId(id);
    setError(null);

    startTransition(async () => {
      const result = await signInDemoAction({ userId: id });
      if (result.ok) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }
      setError(result.error.message);
      setSelectedId(null);
    });
  }

  if (accounts.length === 0) {
    return (
      <Alert tone="warning" title="데모 계정을 찾을 수 없습니다">
        데모 데이터가 아직 만들어지지 않았습니다. 터미널에서 <code>pnpm demo:reset</code> 을 실행한
        뒤 페이지를 새로고침해 주세요.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-fg">데모 계정으로 둘러보기</h2>
        <p className="mt-1 text-sm text-fg-muted">
          역할에 따라 보이는 메뉴와 할 수 있는 작업이 달라집니다. 아래 계정은 모두 가상의 예시
          계정이며 비밀번호가 없습니다.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => {
          const loading = pending && selectedId === account.id;
          return (
            <li key={account.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSelect(account.id)}
                className={cn(
                  'flex h-full w-full flex-col gap-2 rounded-card border border-border bg-surface p-4 text-left',
                  'transition-colors hover:border-primary hover:bg-primary-soft/40',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  loading && 'border-primary bg-primary-soft/60',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-fg">{account.name}</span>
                  <RoleBadge role={account.role} />
                </div>

                <p className="text-xs text-fg-muted">
                  {account.departmentName ? `${account.departmentName} · ` : ''}
                  {account.title}
                </p>
                <p className="text-xs text-fg-subtle">{account.email}</p>
                <p className="mt-auto pt-1 text-xs text-fg-muted">
                  {USER_ROLE_DESCRIPTIONS[account.role]}
                </p>

                <span className="text-xs font-medium text-primary">
                  {loading ? '로그인 중…' : '이 계정으로 로그인 →'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
