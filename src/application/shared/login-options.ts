import 'server-only';
import type { AccountType, AdminPermission, MemberType } from '@/domain/authz/accounts';
import type { UserId } from '@/domain/shared/ids';
import { listDemoAccounts } from '@/lib/auth/demo-auth';
import { getRepositories } from '@/lib/di/container';

/**
 * 로그인 화면에 보여줄 데모 계정 목록.
 *
 * 로그인 전이라 세션이 없다. 그래서 여기서는 **화면에 표시할 최소 정보만** 만든다.
 * 이메일·이름은 RFC 2606 예약 도메인(`demo.university.test`)을 쓰는 가상의 값이다
 * (요구사항 18번: 테스트용 개인정보는 가상의 값만 사용한다).
 */

export interface LoginOption {
  id: UserId;
  name: string;
  email: string;
  accountType: AccountType;
  adminPermissions: readonly AdminPermission[];
  memberType: MemberType;
  title: string;
  departmentName: string | null;
}

export async function listLoginOptions(): Promise<LoginOption[]> {
  const accounts = await listDemoAccounts();
  if (accounts.length === 0) return [];

  const repositories = getRepositories();
  const firstAccount = accounts[0];
  const departments = firstAccount
    ? await repositories.identity.listDepartments(firstAccount.campusId)
    : [];
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));

  // 계정 종류 순서를 고정해 화면이 매번 같은 순서로 보이게 한다.
  const order: Record<AccountType, number> = { USER: 0, ADMIN: 1 };

  return accounts
    .map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      accountType: account.accountType,
      adminPermissions: account.adminPermissions,
      memberType: account.memberType,
      title: account.title,
      departmentName: account.departmentId
        ? (departmentNames.get(account.departmentId) ?? null)
        : null,
    }))
    .sort(
      (a, b) =>
        order[a.accountType] - order[b.accountType] || a.name.localeCompare(b.name, 'ko'),
    );
}
