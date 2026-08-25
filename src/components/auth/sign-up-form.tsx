'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { signUpAction } from '@/actions/auth-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, fieldAria } from '@/components/ui/field';
import { MEMBER_TYPES, MEMBER_TYPE_LABELS } from '@/domain/authz/accounts';
import type { MemberType } from '@/domain/authz/accounts';
import { cn } from '@/lib/utils/cn';

/**
 * 회원가입 (리뷰 2절).
 *
 * 신분만 고르면 된다. 비밀번호를 받지 않는다 — SSO 가 들어올 자리다.
 * 신분은 권한이 아니라 "누구에게 맞는 도구인지"를 가리는 데 쓴다.
 */
export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [memberType, setMemberType] = useState<MemberType>('STAFF');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await signUpAction({ email, name, memberType, title });
      if (result.ok) {
        router.push('/home');
        router.refresh();
        return;
      }
      setFieldErrors(result.error.fields ?? {});
      setError(result.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-fg">어떤 분이신가요</legend>
        <p className="text-xs text-fg-muted">
          권한이 아닙니다. 나에게 맞는 도구를 골라 보여 드리는 데만 씁니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          {MEMBER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={memberType === type}
              onClick={() => setMemberType(type)}
              className={cn(
                'rounded-md border px-3 py-2.5 text-sm transition-colors',
                memberType === type
                  ? 'border-primary bg-primary-soft font-medium text-primary'
                  : 'border-border text-fg-muted hover:bg-surface-muted hover:text-fg',
              )}
            >
              {MEMBER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="이름" htmlFor="signup-name" required error={fieldErrors.name}>
        <Input
          {...fieldAria('signup-name', undefined, fieldErrors.name)}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
      </Field>

      <Field label="이메일" htmlFor="signup-email" required error={fieldErrors.email}>
        <Input
          {...fieldAria('signup-email', undefined, fieldErrors.email)}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </Field>

      <Field
        label="소속·직위"
        htmlFor="signup-title"
        hint="예: 학사관리과 주무관, 컴퓨터공학과 3학년 (비워도 됩니다)"
        error={fieldErrors.title}
      >
        <Input
          {...fieldAria('signup-title', 'hint', fieldErrors.title)}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <Button onClick={submit} disabled={pending} size="lg">
        {pending ? '가입 중…' : '가입하고 시작하기'}
      </Button>

      <p className="text-xs text-fg-subtle">
        지금은 비밀번호 없이 가입합니다. 학교 계정 연동(SSO)은 나중에 붙습니다.
      </p>
    </div>
  );
}
