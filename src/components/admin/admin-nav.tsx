'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const ITEMS = [
  { href: '/admin', label: '현황' },
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/departments', label: '부서' },
  { href: '/admin/categories', label: '카테고리' },
  { href: '/admin/audit-logs', label: '감사 로그' },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="관리 메뉴" className="flex gap-1 overflow-x-auto border-b border-border">
      {ITEMS.map((item) => {
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
