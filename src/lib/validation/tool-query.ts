import { DEFAULT_PAGE_SIZE } from '@/domain/shared/pagination';
import { DATA_CLASSIFICATIONS, TOOL_STATUSES } from '@/domain/tool/types';

/**
 * 목록 화면의 검색 조건.
 *
 * 조건을 전부 URL(`searchParams`)에 담는다. 그래서 주소를 복사해 공유하면
 * 상대도 같은 화면을 본다. 뒤로가기와 새 탭 열기도 자연스럽게 동작한다.
 *
 * 값이 이상해도 오류를 내지 않고 기본값으로 되돌린다. 주소창은 누구나
 * 고칠 수 있으므로 잘못된 값에 화면이 깨져서는 안 된다.
 */

export const TOOL_SORT_KEYS = ['RECENT', 'POPULAR', 'EVALUATION', 'NAME'] as const;
export type ToolSortKeyValue = (typeof TOOL_SORT_KEYS)[number];

export const TOOL_SORT_LABELS: Record<ToolSortKeyValue, string> = {
  RECENT: '최근 등록순',
  POPULAR: '많이 쓰는 순',
  EVALUATION: '평가 좋은 순',
  NAME: '이름순',
};

export const TOOL_VIEW_MODES = ['card', 'table'] as const;
export type ToolViewMode = (typeof TOOL_VIEW_MODES)[number];

export interface ToolQuery {
  keyword: string;
  statuses: string[];
  categoryIds: string[];
  classifications: string[];
  page: number;
  sort: ToolSortKeyValue;
  view: ToolViewMode;
  onlyMine: boolean;
  pageSize: number;
}

/** URL 검색 조건을 안전한 값으로 바꾼다. */
export function parseToolQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ToolQuery {
  function list(key: string, allowed?: readonly string[]): string[] {
    const raw = searchParams[key];
    const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    const flattened = [
      ...new Set(flatten(values).map((item) => item.trim())),
    ].filter((item) => item !== '');
    return allowed ? flattened.filter((item) => allowed.includes(item)) : flattened;
  }

  function flatten(values: string[]): string[] {
    return values.flatMap((value) => value.split(','));
  }

  function single(key: string): string {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ?? '';
  }

  const pageValue = Number(single('page'));
  const sortValue = single('sort');
  const viewValue = single('view');
  const mineValue = single('mine');

  return {
    keyword: single('q').trim().slice(0, 100),
    statuses: list('status', TOOL_STATUSES),
    categoryIds: list('category'),
    classifications: list('classification', DATA_CLASSIFICATIONS),
    page: Number.isFinite(pageValue) && pageValue >= 1 ? Math.floor(pageValue) : 1,
    sort: (TOOL_SORT_KEYS as readonly string[]).includes(sortValue)
      ? (sortValue as ToolSortKeyValue)
      : 'RECENT',
    view: (TOOL_VIEW_MODES as readonly string[]).includes(viewValue)
      ? (viewValue as ToolViewMode)
      : 'card',
    onlyMine: mineValue === '1' || mineValue === 'true',
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

/** 현재 조건을 유지한 채 일부만 바꾼 URL 을 만든다. */
export function buildToolHref(query: ToolQuery, overrides: Partial<ToolQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (merged.keyword) params.set('q', merged.keyword);
  for (const status of merged.statuses) params.append('status', status);
  for (const category of merged.categoryIds) params.append('category', category);
  for (const classification of merged.classifications) {
    params.append('classification', classification);
  }
  if (merged.sort !== 'RECENT') params.set('sort', merged.sort);
  if (merged.view !== 'card') params.set('view', merged.view);
  if (merged.onlyMine) params.set('mine', '1');
  // 조건이 바뀌면 1페이지부터 다시 본다. page 를 명시적으로 넘긴 경우만 유지한다.
  if (merged.page > 1) params.set('page', String(merged.page));

  const queryString = params.toString();
  return queryString ? `/tools?${queryString}` : '/tools';
}
