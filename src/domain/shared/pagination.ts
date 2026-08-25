export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

export interface PageRequest {
  /** 1부터 시작 */
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function normalizePageRequest(
  page: number | undefined,
  pageSize: number | undefined,
): PageRequest {
  const safePage = Number.isFinite(page) && (page ?? 0) >= 1 ? Math.floor(page as number) : 1;
  const requested =
    Number.isFinite(pageSize) && (pageSize ?? 0) >= 1
      ? Math.floor(pageSize as number)
      : DEFAULT_PAGE_SIZE;
  return { page: safePage, pageSize: Math.min(requested, MAX_PAGE_SIZE) };
}

/** 이미 메모리에 올라온 배열을 페이지로 자른다. (DEMO 저장소용) */
export function paginate<T>(all: readonly T[], request: PageRequest): Page<T> {
  const totalItems = all.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / request.pageSize));
  const page = Math.min(request.page, totalPages);
  const start = (page - 1) * request.pageSize;
  return {
    items: all.slice(start, start + request.pageSize),
    page,
    pageSize: request.pageSize,
    totalItems,
    totalPages,
  };
}

export function emptyPage<T>(request: PageRequest): Page<T> {
  return {
    items: [],
    page: request.page,
    pageSize: request.pageSize,
    totalItems: 0,
    totalPages: 1,
  };
}
