import 'server-only';
import { cookies } from 'next/headers';
import type { Profile } from '@/domain/identity/types';
import { unauthenticated } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { UserId } from '@/domain/shared/ids';
import { getRepositories } from '../di/container';
import {
  SESSION_COOKIE_NAME,
  createSessionValue,
  readSessionValue,
  sessionCookieOptions,
} from './session';

/**
 * DEMO 모드 인증.
 *
 * 비밀번호가 없다. `/login` 에서 데모 계정 카드를 고르면 그 사용자로 세션이 만들어진다.
 * 데모 데이터를 손으로 둘러보게 하는 것이 목적이고, 인증 자체를 흉내 내려는 것이 아니다.
 *
 * 안전장치:
 *  - `isDemoAccount === true` 인 프로필로만 로그인할 수 있다.
 *    운영 데이터가 섞인 저장소에 실수로 붙어도 실제 계정으로는 들어가지 못한다.
 *  - 비활성(`isActive === false`) 계정은 거부한다.
 */

export async function listDemoAccounts(): Promise<Profile[]> {
  const repositories = getRepositories();
  const campus = await repositories.identity.getDefaultCampus();
  const profiles = await repositories.identity.listProfiles(campus.id);
  return profiles.filter((profile) => profile.isDemoAccount && profile.isActive);
}

export async function signInAsDemoUser(userId: UserId): Promise<Profile> {
  const repositories = getRepositories();
  const profile = await repositories.identity.getProfile(userId);

  if (!profile || !profile.isActive || profile.deletedAt !== null) {
    throw unauthenticated('선택한 계정으로 로그인할 수 없습니다. 다른 데모 계정을 선택해 주세요.');
  }
  if (!profile.isDemoAccount) {
    throw unauthenticated(
      'DEMO 모드에서는 데모 계정으로만 로그인할 수 있습니다. 운영 계정은 Supabase 모드에서 사용해 주세요.',
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionValue(profile.id), sessionCookieOptions());
  return profile;
}

export async function signOutDemoUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** 쿠키에서 현재 사용자를 읽는다. 로그인하지 않았으면 null. */
export async function getDemoSessionProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const userId = readSessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return null;

  const profile = await getRepositories().identity.getProfile(asId<UserId>(userId));
  if (!profile || !profile.isActive || profile.deletedAt !== null) return null;
  return profile;
}
