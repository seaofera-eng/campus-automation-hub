import { redirect } from 'next/navigation';
import Link from 'next/link';
import { loadAppShellContext } from '@/application/shared/context';
import { DemoBanner } from '@/components/layout/demo-banner';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { isDemoMode } from '@/lib/config/env';

/**
 * 로그인 후 공통 껍데기.
 *
 * 인증 확인이 여기 한 번 있지만, 이것만으로 보안이 되는 것은 아니다.
 * 각 서버 액션과 데이터 조회는 별도로 `requirePermission()` 을 통과한다 (요구사항 5번).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await loadAppShellContext();
  if (!context) {
    redirect('/login');
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col">
        {isDemoMode() ? <DemoBanner /> : null}

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
        >
          본문으로 건너뛰기
        </a>

        <div className="flex flex-1">
          <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
            <div className="flex h-14 items-center gap-2 border-b border-border px-5">
              <Link href="/dashboard" className="text-sm font-bold text-fg">
                캠퍼스 자동화 관제
              </Link>
            </div>
            <Sidebar accountType={context.profile.accountType}
              adminPermissions={context.profile.adminPermissions} />
            {context.campusName ? (
              <p className="px-5 py-3 text-xs text-fg-subtle">{context.campusName}</p>
            ) : null}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              profile={context.profile}
              departmentName={context.departmentName}
              notifications={context.notifications}
            />

            {/* 좁은 화면에서는 사이드바 대신 상단 가로 스크롤 메뉴를 쓴다. */}
            <div className="border-b border-border bg-surface md:hidden">
              <Sidebar accountType={context.profile.accountType}
              adminPermissions={context.profile.adminPermissions} orientation="horizontal" />
            </div>

            <main id="main-content" className="min-w-0 flex-1 p-4 sm:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
