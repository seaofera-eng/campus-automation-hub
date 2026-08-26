import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { Alert } from '@/components/ui/alert';
import { getCurrentProfile } from '@/lib/auth/current-user';
import { isDemoMode } from '@/lib/config/env';

export const metadata: Metadata = { title: '회원가입' };

/** 회원가입 (리뷰 2절) */
export default async function SignUpPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect('/home');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-10">
      <div>
        <h1 className="text-xl font-bold text-fg">가입하기</h1>
        <p className="mt-1 text-sm text-fg-muted">
          교내 구성원이 만든 업무 자동화 도구를 쓰고, 필요한 것을 요청할 수 있습니다.
        </p>
      </div>

      {isDemoMode() ? (
        <SignUpForm />
      ) : (
        <Alert tone="info" title="지금은 학교 계정으로만 가입합니다">
          학교 계정 연동(SSO)이 붙기 전까지는 관리자가 계정을 만들어 드립니다. 정보화본부로
          문의해 주세요.
        </Alert>
      )}

      <p className="text-sm text-fg-muted">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
