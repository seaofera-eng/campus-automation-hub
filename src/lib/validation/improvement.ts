import { z } from 'zod';
import {
  IMPACT_LEVELS,
  IMPROVEMENT_STATUSES,
  IMPROVEMENT_TYPES,
  URGENCY_LEVELS,
} from '@/domain/improvement/types';
import { optionalText, requiredText } from './common';

/**
 * 개선 요청 폼 검증 (요구사항 9번).
 */

export const createImprovementSchema = z.object({
  toolId: z.string().min(1, '어떤 도구에 대한 요청인지 선택해 주세요.'),
  title: requiredText('제목', 2, 150),
  requestType: z.enum(IMPROVEMENT_TYPES),
  detail: requiredText('상세 내용', 10, 4000),
  businessImpact: z.enum(IMPACT_LEVELS).default('MEDIUM'),
  urgency: z.enum(URGENCY_LEVELS).default('MEDIUM'),
});

export const transitionImprovementSchema = z.object({
  improvementId: z.string().min(1),
  toStatus: z.enum(IMPROVEMENT_STATUSES),
  /** 상태를 바꾸며 남기는 처리 의견 */
  comment: optionalText.pipe(z.string().max(2000, '의견은 2000자까지 입력할 수 있습니다.')),
});

/* -------------------------------------------------------------------------- */
/* 목록 검색 조건                                                              */
/* -------------------------------------------------------------------------- */

export interface ImprovementQueryInput {
  keyword: string;
  statuses: string[];
  toolId: string;
  /** 나에게 배정된 것만 */
  assignedToMe: boolean;
  /** 내가 요청한 것만 */
  requestedByMe: boolean;
  page: number;
  pageSize: number;
}

export function parseImprovementQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ImprovementQueryInput {
  function single(key: string): string {
    const raw = searchParams[key];
    return (Array.isArray(raw) ? raw[0] : raw) ?? '';
  }

  function list(key: string, allowed: readonly string[]): string[] {
    const raw = searchParams[key];
    const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    return [...new Set(values.flatMap((value) => value.split(',')).map((v) => v.trim()))].filter(
      (value) => allowed.includes(value),
    );
  }

  const pageValue = Number(single('page'));

  return {
    keyword: single('q').trim().slice(0, 100),
    statuses: list('status', IMPROVEMENT_STATUSES),
    toolId: single('tool'),
    assignedToMe: single('assignee') === 'me',
    requestedByMe: single('requester') === 'me',
    page: Number.isFinite(pageValue) && pageValue >= 1 ? Math.floor(pageValue) : 1,
    pageSize: 15,
  };
}

export function buildImprovementHref(
  query: ImprovementQueryInput,
  overrides: Partial<ImprovementQueryInput> = {},
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (merged.keyword) params.set('q', merged.keyword);
  for (const status of merged.statuses) params.append('status', status);
  if (merged.toolId) params.set('tool', merged.toolId);
  if (merged.assignedToMe) params.set('assignee', 'me');
  if (merged.requestedByMe) params.set('requester', 'me');
  if (merged.page > 1) params.set('page', String(merged.page));

  const queryString = params.toString();
  return queryString ? `/improvements?${queryString}` : '/improvements';
}
