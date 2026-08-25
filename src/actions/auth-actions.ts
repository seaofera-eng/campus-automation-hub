'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validationFailed } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { UserId } from '@/domain/shared/ids';
import { run, type ActionResult } from '@/lib/actions/result';
import { signOut } from '@/lib/auth/current-user';
import { signInAsDemoUser } from '@/lib/auth/demo-auth';
import { signInWithPassword } from '@/lib/auth/supabase-auth';
import { isDemoMode } from '@/lib/config/env';

/**
 * 인증 서버 액션.
 *
 * 로그인 자체는 권한 검사 대상이 아니지만, 모드에 맞지 않는 경로는 막는다.
 * (DEMO 모드에서 비밀번호 로그인 시도, 그 반대 모두)
 */

const demoSignInSchema = z.object({
  userId: z.string().min(1, '로그인할 계정을 선택해 주세요.'),
});

export async function signInDemoAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    if (!isDemoMode()) {
      throw validationFailed(
        {},
        'DEMO 계정 로그인은 DEMO 모드에서만 사용할 수 있습니다. 이메일과 비밀번호로 로그인해 주세요.',
      );
    }

    const parsed = demoSignInSchema.safeParse(input);
    if (!parsed.success) {
      throw validationFailed({ userId: '로그인할 계정을 선택해 주세요.' });
    }

    await signInAsDemoUser(asId<UserId>(parsed.data.userId));
    return null;
  });
}

const passwordSignInSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

export async function signInAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    if (isDemoMode()) {
      throw validationFailed(
        {},
        '현재 DEMO 모드입니다. 아래 데모 계정 중 하나를 선택해 로그인해 주세요.',
      );
    }

    const parsed = passwordSignInSchema.safeParse(input);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string') fields[key] = issue.message;
      }
      throw validationFailed(fields);
    }

    await signInWithPassword(parsed.data.email, parsed.data.password);
    return null;
  });
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/login');
}
