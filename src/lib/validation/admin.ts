import { z } from 'zod';
import { ACCOUNT_TYPES, ADMIN_PERMISSIONS } from '@/domain/authz/accounts';
import { optionalText, requiredText } from './common';

/**
 * 관리자 작업 폼 검증 (요구사항 11번).
 */

export const changeAccountPermissionsSchema = z
  .object({
    userId: z.string().min(1),
    accountType: z.enum(ACCOUNT_TYPES),
    /** 관리자에게 줄 세부 권한. 이용자로 바꾸면 비어 있어야 한다. */
    adminPermissions: z.array(z.enum(ADMIN_PERMISSIONS)).default([]),
    /** 왜 권한을 바꾸는지. 감사 로그에 남는다. */
    reason: requiredText('변경 사유', 5, 500),
  })
  .superRefine((value, context) => {
    if (value.accountType === 'USER' && value.adminPermissions.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['adminPermissions'],
        message: '이용자 계정에는 관리 권한을 줄 수 없습니다. 계정 종류를 관리자로 바꾸거나 권한을 모두 해제해 주세요.',
      });
    }
    if (value.accountType === 'ADMIN' && value.adminPermissions.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['adminPermissions'],
        message: '관리자로 지정하려면 권한을 하나 이상 골라 주세요. 권한이 없는 관리자는 이용자와 같습니다.',
      });
    }
  });

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  departmentId: optionalText,
  title: optionalText.pipe(z.string().max(100, '직위는 100자까지 입력할 수 있습니다.')),
  isActive: z.boolean(),
});

export const upsertDepartmentSchema = z.object({
  departmentId: optionalText,
  name: requiredText('부서 이름', 1, 100),
  code: requiredText('부서 코드', 1, 40),
  parentId: optionalText,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const deleteDepartmentSchema = z.object({
  departmentId: z.string().min(1),
});

export const upsertCategorySchema = z.object({
  categoryId: optionalText,
  name: requiredText('카테고리 이름', 1, 100),
  code: requiredText('카테고리 코드', 1, 40),
  description: optionalText.pipe(z.string().max(300, '설명은 300자까지 입력할 수 있습니다.')),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

/* -------------------------------------------------------------------------- */
/* 감사 로그 검색                                                              */
/* -------------------------------------------------------------------------- */

export interface AuditQueryInput {
  action: string;
  actorUserId: string;
  targetType: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
}

export function parseAuditQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AuditQueryInput {
  function single(key: string): string {
    const raw = searchParams[key];
    return ((Array.isArray(raw) ? raw[0] : raw) ?? '').trim();
  }

  const pageValue = Number(single('page'));
  const from = single('from');
  const to = single('to');
  const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  return {
    action: single('action').slice(0, 80),
    actorUserId: single('actor'),
    targetType: single('target').slice(0, 40),
    // 날짜 형식이 아니면 무시한다. 주소창은 누구나 고칠 수 있다.
    from: isDate(from) ? `${from}T00:00:00.000Z` : '',
    to: isDate(to) ? `${to}T23:59:59.999Z` : '',
    page: Number.isFinite(pageValue) && pageValue >= 1 ? Math.floor(pageValue) : 1,
    pageSize: 30,
  };
}

export function buildAuditHref(
  query: AuditQueryInput,
  overrides: Partial<AuditQueryInput> = {},
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (merged.action) params.set('action', merged.action);
  if (merged.actorUserId) params.set('actor', merged.actorUserId);
  if (merged.targetType) params.set('target', merged.targetType);
  if (merged.from) params.set('from', merged.from.slice(0, 10));
  if (merged.to) params.set('to', merged.to.slice(0, 10));
  if (merged.page > 1) params.set('page', String(merged.page));

  const queryString = params.toString();
  return queryString ? `/admin/audit-logs?${queryString}` : '/admin/audit-logs';
}

/**
 * 감사 로그에 걸어 둔 필터가 하나라도 있는지.
 *
 * "결과가 없다"를 안내할 때 필터 탓인지 아직 기록이 없는 것인지 갈라 준다.
 * `page` 와 `pageSize` 는 사용자가 고른 조건이 아니므로 세지 않는다.
 */
export function hasAuditFilter(query: AuditQueryInput): boolean {
  return Boolean(query.action || query.actorUserId || query.targetType || query.from || query.to);
}
