import 'server-only';
import type { MemberType } from '@/domain/authz/accounts';
import type { Profile } from '@/domain/identity/types';
import { conflict, preconditionFailed } from '@/domain/shared/errors';
import { newId } from '@/domain/shared/ids';
import type { UserId } from '@/domain/shared/ids';
import { isDemoMode } from '@/lib/config/env';
import { getRepositories } from '@/lib/di/container';
import { DEMO_CAMPUS_ID } from '@/repositories/demo/seed-ids';

/**
 * 회원가입 (리뷰 2절).
 *
 * "향후 SSO를 생각하고 있는데, 아직 구현을 하지 않고 기본적인 회원가입으로
 *  교직원, 학생, 교수, 일반인만 구별했으면 좋겠음."
 *
 * 지금 하는 일은 하나다. **신분을 받아 이용자 계정을 만든다.**
 * 관리 권한은 주지 않는다 — 그건 관리자가 나중에 부여한다.
 *
 * 비밀번호를 여기서 다루지 않는다. DEMO 모드에는 비밀번호 개념이 없고,
 * Supabase 모드의 가입은 SSO 로 갈 자리라 지금 흉내 내지 않는다.
 */

export interface SignUpInput {
  email: string;
  name: string;
  memberType: MemberType;
  /** 직위·학과 등 표시용. 비워도 된다. */
  title: string;
}

export async function signUpDemoUser(input: SignUpInput): Promise<Profile> {
  if (!isDemoMode()) {
    throw preconditionFailed(
      '지금은 학교 계정으로만 가입할 수 있습니다. 관리자에게 계정 생성을 요청해 주세요.',
    );
  }

  const repositories = getRepositories();

  // 데모 캠퍼스에 붙인다. 캠퍼스가 하나뿐인 구조다.
  const campus = await repositories.identity.getCampus(DEMO_CAMPUS_ID);
  if (!campus) throw preconditionFailed('캠퍼스 정보가 없습니다. 데모 데이터를 초기화해 주세요.');

  const existing = await repositories.identity.listProfiles(campus.id);
  const normalized = input.email.trim().toLowerCase();
  if (existing.some((profile) => profile.email.toLowerCase() === normalized)) {
    throw conflict('이미 가입된 이메일입니다. 로그인 화면에서 해당 계정을 선택해 주세요.');
  }

  const now = new Date().toISOString();

  return repositories.identity.updateProfile({
    id: newId<UserId>(),
    campusId: campus.id,
    email: normalized,
    name: input.name,
    title: input.title,
    // 가입은 언제나 이용자로 시작한다. 관리 권한은 따로 받는다.
    accountType: 'USER',
    adminPermissions: [],
    memberType: input.memberType,
    isActive: true,
    // 이 계정도 데모 데이터다. 화면에서 운영 계정과 구분해 표시한다.
    isDemoAccount: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
}
