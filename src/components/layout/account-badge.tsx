import { GraduationCap, ShieldCheck, User, UserRound, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import {
  ACCOUNT_TYPE_LABELS,
  ADMIN_PERMISSION_LABELS,
  MEMBER_TYPE_LABELS,
} from '@/domain/authz/accounts';
import type { AccountType, AdminPermission, MemberType } from '@/domain/authz/accounts';

/**
 * 계정 종류 배지.
 *
 * 관리자는 가진 권한 수까지 함께 보여 준다. 권한 없는 관리자 계정은
 * 실제로 이용자와 같은 일만 할 수 있으므로 그렇게 보이면 오해를 부른다.
 */
const ACCOUNT_LOOKS: Record<AccountType, { tone: BadgeTone; icon: LucideIcon }> = {
  ADMIN: { tone: 'danger', icon: ShieldCheck },
  USER: { tone: 'neutral', icon: User },
};

export function AccountTypeBadge({
  accountType,
  adminPermissions = [],
}: {
  accountType: AccountType;
  adminPermissions?: readonly AdminPermission[];
}) {
  const look = ACCOUNT_LOOKS[accountType];
  const label =
    accountType === 'ADMIN' && adminPermissions.length > 0
      ? `${ACCOUNT_TYPE_LABELS.ADMIN} · 권한 ${adminPermissions.length}개`
      : ACCOUNT_TYPE_LABELS[accountType];

  return (
    <Badge tone={look.tone} icon={look.icon}>
      {label}
    </Badge>
  );
}

/** 관리 권한 하나를 나타내는 칩 */
export function AdminPermissionBadge({ permission }: { permission: AdminPermission }) {
  return <Badge tone="info">{ADMIN_PERMISSION_LABELS[permission]}</Badge>;
}

/**
 * 학내 신분 배지. 권한이 아니라 "누구인지"다.
 * 도구·수요 목록에서 "누구에게 맞는 것인지" 가리는 데 쓴다.
 */
const MEMBER_LOOKS: Record<MemberType, { tone: BadgeTone; icon: LucideIcon }> = {
  STUDENT: { tone: 'primary', icon: GraduationCap },
  STAFF: { tone: 'info', icon: Users },
  PROFESSOR: { tone: 'success', icon: UserRound },
  EXTERNAL: { tone: 'neutral', icon: User },
};

export function MemberTypeBadge({ memberType }: { memberType: MemberType }) {
  const look = MEMBER_LOOKS[memberType];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {MEMBER_TYPE_LABELS[memberType]}
    </Badge>
  );
}
