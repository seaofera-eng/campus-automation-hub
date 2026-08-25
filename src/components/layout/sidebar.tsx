'use client';

import {
  ClipboardCheck,
  LayoutDashboard,
  Lightbulb,
  Settings,
  Wrench,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/domain/authz/roles';
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
  /** 지정하지 않으면 모든 역할에게 보인다 */
  roles?: readonly UserRole[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/tools', label: '자동화 도구', icon: Wrench },
  { href: '/demands', label: '업무 수요', icon: Lightbulb },
  { href: '/reviews', label: '검토 작업', icon: ClipboardCheck, roles: ['REVIEWER', 'ADMIN'] },
  { href: '/improvements', label: '개선 요청', icon: Wand2 },
  { href: '/admin', label: '관리', icon: Settings, roles: ['ADMIN'] },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface SidebarProps {
  role: UserRole;
  /** 좁은 화면에서는 가로 스크롤 메뉴로 쓴다. */
  orientation?: 'vertical' | 'horizontal';
}

export function Sidebar({ role, orientation = 'vertical' }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn(
        'gap-1 p-3',
        orientation === 'vertical' ? 'flex flex-col' : 'flex overflow-x-auto',
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
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              orientation === 'horizontal' && 'shrink-0 whitespace-nowrap',
              active
                ? 'bg-primary-soft text-primary'
                : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
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
