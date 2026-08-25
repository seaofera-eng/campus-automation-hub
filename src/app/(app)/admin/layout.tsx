import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/admin-nav';
import { requirePermission } from '@/lib/auth/current-user';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: '관리' };

/**
 * 관리 화면 공통 껍데기.
 *
 * 여기서 한 번 막지만 이것만으로 보안이 되는 것은 아니다.
 * 각 페이지의 조회 서비스와 서버 액션이 다시 `assertCan()` 을 통과한다.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await guardPage(() => requirePermission('admin:dashboard'));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">관리</h1>
        <p className="mt-1 text-sm text-fg-muted">
          계정 권한, 조직, 카테고리, 감사 로그를 관리합니다.
        </p>
      </div>

      <AdminNav permissions={profile.adminPermissions} />
      {children}
    </div>
  );
}
