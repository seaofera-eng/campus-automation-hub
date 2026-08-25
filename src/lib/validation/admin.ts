import { z } from 'zod';
import { USER_ROLES } from '@/domain/authz/roles';
import { optionalText, requiredText } from './common';

/**
 * 관리자 작업 폼 검증 (요구사항 11번).
 */

export const changeUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(USER_ROLES),
  /** 왜 역할을 바꾸는지. 감사 로그에 남는다. */
  reason: requiredText('변경 사유', 5, 500),
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
