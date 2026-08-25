import 'server-only';
import type { Profile } from '@/domain/identity/types';
import { unauthenticated } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { UserId } from '@/domain/shared/ids';
import { getUserClient } from '@/repositories/supabase/client';
import { getRepositories } from '../di/container';

/**
 * Supabase 모드 인증.
 *
 * 세션은 `@supabase/ssr` 이 쿠키로 관리한다. 여기서는 그 세션의 사용자 ID로
 * `profiles` 행을 읽어 도메인 Profile 로 바꿔 주는 일만 한다.
 *
 * ⚠️ 이 경로는 아직 실제 Supabase 프로젝트로 검증되지 않았다 (docs/SETUP.md 참고).
 */

export async function signInWithPassword(email: string, password: string): Promise<Profile> {
  const supabase = await getUserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    // 이메일이 없는 것인지 비밀번호가 틀린 것인지 구분해 알려주지 않는다.
    throw unauthenticated('이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.');
  }

  const profile = await getRepositories().identity.getProfile(asId<UserId>(data.user.id));
  if (!profile) {
    throw unauthenticated(
      '사용자 프로필이 없습니다. 관리자에게 계정 등록을 요청해 주세요.',
    );
  }
  return profile;
}

export async function signOutSupabaseUser(): Promise<void> {
  const supabase = await getUserClient();
  await supabase.auth.signOut();
}

export async function getSupabaseSessionProfile(): Promise<Profile | null> {
  const supabase = await getUserClient();
  // getUser() 는 매번 서버에 토큰을 검증시킨다. getSession() 은 쿠키를 그대로 믿으므로 쓰지 않는다.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const profile = await getRepositories().identity.getProfile(asId<UserId>(data.user.id));
  if (!profile || !profile.isActive || profile.deletedAt !== null) return null;
  return profile;
}
