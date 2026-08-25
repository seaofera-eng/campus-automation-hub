import 'server-only';
import type { Profile } from '@/domain/identity/types';
import type { Notification } from '@/domain/observability/types';
import { getCurrentProfile } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 화면 껍데기(사이드바·상단바)가 필요로 하는 최소 정보.
 *
 * app/ 계층은 저장소를 직접 부를 수 없으므로 이 서비스를 경유한다.
 */

export interface AppShellContext {
  profile: Profile;
  departmentName: string | null;
  campusName: string;
  notifications: Notification[];
}

/** 로그인하지 않았으면 null. 레이아웃이 /login 으로 보낸다. */
export async function loadAppShellContext(): Promise<AppShellContext | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const repositories = getRepositories();

  const [campus, department, notifications] = await Promise.all([
    repositories.identity.getCampus(profile.campusId),
    profile.departmentId
      ? repositories.identity.getDepartment(profile.departmentId)
      : Promise.resolve(null),
    repositories.observability.listNotifications(profile.id, false),
  ]);

  return {
    profile,
    departmentName: department?.name ?? null,
    campusName: campus?.name ?? '',
    notifications,
  };
}
