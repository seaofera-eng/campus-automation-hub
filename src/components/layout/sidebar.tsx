'use client';

import {
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Settings,
  Trophy,
  Wand2,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AccountType, AdminPermission } from '@/domain/authz/accounts';
import { canEnterAdminArea, hasAdminPermission } from '@/domain/authz/accounts';
import { cn } from '@/lib/utils/cn';

/**
 * 좌측 내비게이션.
 *
 * 역할에 맞지 않는 메뉴는 감춘다. 다만 이것은 **편의 기능일 뿐 보안 경계가 아니다.**
 * 주소를 직접 입력해 들어와도 서버에서 `requirePermission()` 이 막는다 (요구사항 5번).
 */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * 이 메뉴를 보려면 필요한 관리 권한. 지정하지 않으면 모두에게 보인다.
   * 'ANY_ADMIN' 은 관리 권한을 하나라도 가진 경우를 뜻한다.
   */
  requires?: AdminPermission | 'ANY_ADMIN';
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/tools', label: '자동화 도구', icon: Wrench },
  { href: '/demands', label: '업무 수요', icon: Lightbulb },
  { href: '/ranking', label: '도구 순위', icon: Trophy },
  { href: '/reviews', label: '검토 작업', icon: ClipboardCheck, requires: 'REVIEW' },
  { href: '/improvements', label: '개선 요청', icon: Wand2 },
  { href: '/notices', label: '공지', icon: Megaphone },
  { href: '/admin', label: '관리', icon: Settings, requires: 'ANY_ADMIN' },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface SidebarProps {
  accountType: AccountType;
  adminPermissions: readonly AdminPermission[];
  /** 좁은 화면에서는 가로 스크롤 메뉴로 쓴다. */
  orientation?: 'vertical' | 'horizontal';
}

export function Sidebar({ accountType, adminPermissions, orientation = 'vertical' }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => {
    if (!item.requires) return true;
    if (item.requires === 'ANY_ADMIN') return canEnterAdminArea(accountType, adminPermissions);
    return hasAdminPermission(accountType, adminPermissions, item.requires);
  });

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn(
        'gap-1',
        orientation === 'vertical' ? 'flex flex-col p-3' : 'flex overflow-x-auto px-3 py-2',
      )}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              // 최소 40px 높이를 확보한다 (디자인 문서 §13).
              'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              orientation === 'horizontal' && 'shrink-0 whitespace-nowrap',
              // 선택 표시는 soft-fill 하나만 쓴다. 왼쪽 선까지 같이 넣으면
              // 표시가 두 겹이 된다 (문서 §7).
              active
                ? 'bg-primary-soft font-semibold text-primary'
                : 'font-medium text-fg-muted hover:bg-surface-muted hover:text-fg',
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
