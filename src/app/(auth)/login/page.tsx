import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { listLoginOptions } from '@/application/shared/login-options';
import { DemoLoginForm } from '@/components/auth/demo-login-form';
import { PasswordLoginForm } from '@/components/auth/password-login-form';
import { DemoBanner } from '@/components/layout/demo-banner';
import { getCurrentProfile } from '@/lib/auth/current-user';
import { isDemoMode } from '@/lib/config/env';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage() {
  if (await getCurrentProfile()) {
    redirect('/dashboard');
  }

  const demo = isDemoMode();
  const accounts = demo ? await listLoginOptions() : [];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {demo ? <DemoBanner /> : null}

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fg">캠퍼스 자동화 관제 플랫폼</h1>
          <p className="mt-2 text-sm text-fg-muted">
            교내에서 만들어진 AI 서비스와 업무 자동화 도구를 한곳에 모아 등록·검토·평가·개선합니다.
          </p>
        </div>

        {demo ? <DemoLoginForm accounts={accounts} /> : <PasswordLoginForm />}
      </main>
    </div>
  );
}
