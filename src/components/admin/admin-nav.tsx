'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminPermission } from '@/domain/authz/accounts';
import { cn } from '@/lib/utils/cn';

/**
 * 탭마다 필요한 권한이 다르다. 받지 못한 권한의 탭은 아예 보여주지 않는다.
 * 보여 놓고 눌렀을 때 404 가 나면 "고장 났나" 싶어진다.
 * (`requires` 가 없는 탭은 관리 화면에 들어온 사람 모두에게 보인다.)
 */
const ITEMS: readonly { href: string; label: string; requires?: AdminPermission }[] = [
  { href: '/admin', label: '현황' },
  { href: '/admin/users', label: '사용자', requires: 'MANAGE_USERS' },
  { href: '/admin/categories', label: '카테고리', requires: 'MANAGE_CATEGORIES' },
  { href: '/admin/consolidation', label: '통합 표준화', requires: 'MANAGE_TOOLS' },
  { href: '/admin/audit-logs', label: '감사 로그', requires: 'VIEW_AUDIT' },
];

export function AdminNav({ permissions }: { permissions: readonly AdminPermission[] }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.requires || permissions.includes(item.requires));

  return (
    <nav aria-label="관리 메뉴" className="flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        // '/admin' 은 정확히 일치할 때만 활성화한다. 하위 경로까지 잡으면 항상 켜진다.
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
