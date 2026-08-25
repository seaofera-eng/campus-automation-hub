'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { signInAction } from '@/actions/auth-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, fieldAria } from '@/components/ui/field';

/** Supabase 모드 로그인. */
export function PasswordLoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setFields({});

    startTransition(async () => {
      const result = await signInAction({
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      });

      if (result.ok) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }
      setMessage(result.error.message);
      setFields(result.error.fields ?? {});
    });
  }

  return (
    <Card>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {message ? <Alert tone="danger">{message}</Alert> : null}

          <Field label="이메일" htmlFor="email" required error={fields.email}>
            <Input
              {...fieldAria('email', undefined, fields.email)}
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@university.ac.kr"
              required
            />
          </Field>

          <Field label="비밀번호" htmlFor="password" required error={fields.password}>
            <Input
              {...fieldAria('password', undefined, fields.password)}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
