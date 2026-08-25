import 'server-only';
import type { PermissionAction } from '@/domain/authz/actions';
import type { Actor, ResourceContext } from '@/domain/authz/policies';
import { assertCan, can } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { unauthenticated } from '@/domain/shared/errors';
import { isDemoMode } from '../config/env';
import { getDemoSessionProfile, signOutDemoUser } from './demo-auth';
import { getSupabaseSessionProfile, signOutSupabaseUser } from './supabase-auth';

/**
 * 인증 진입점.
 *
 * DEMO / Supabase 분기는 여기와 `lib/di/container.ts` 에만 있다.
 * 상위 계층(서버 액션·Server Component)은 아래 함수만 쓴다.
 *
 * 요구사항 5번: 권한 검사는 화면에서만 하지 않는다. 모든 서버 액션이
 * `requirePermission()` 을 통과해야 한다. UI의 버튼 숨김은 편의 기능일 뿐이다.
 */

export async function getCurrentProfile(): Promise<Profile | null> {
  return isDemoMode() ? getDemoSessionProfile() : getSupabaseSessionProfile();
}

/** 로그인하지 않았으면 DomainError('UNAUTHENTICATED')를 던진다. */
export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw unauthenticated();
  }
  return profile;
}

export function toActor(profile: Profile): Actor {
  return {
    id: profile.id,
    accountType: profile.accountType,
    adminPermissions: profile.adminPermissions,
    campusId: profile.campusId,
  };
}

/**
 * 로그인 + 권한을 한 번에 확인한다. 서버 액션의 표준 진입 검사.
 * 권한이 없으면 DomainError('FORBIDDEN')를 던진다.
 */
export async function requirePermission(
  action: PermissionAction,
  context: ResourceContext = {},
): Promise<Profile> {
  const profile = await requireUser();
  assertCan(toActor(profile), action, context);
  return profile;
}

/**
 * 화면에서 버튼 노출 여부를 정할 때 쓴다.
 * **보안 경계가 아니다.** 실제 차단은 항상 서버 액션의 requirePermission() 이 한다.
 */
export function canProfile(
  profile: Profile,
  action: PermissionAction,
  context: ResourceContext = {},
): boolean {
  return can(toActor(profile), action, context);
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) {
    await signOutDemoUser();
    return;
  }
  await signOutSupabaseUser();
}
