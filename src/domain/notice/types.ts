import type { CampusId, UserId } from '../shared/ids';

/**
 * 공지 (리뷰 1절: "[공지게시판]도 생성해서 노출").
 *
 * 랜딩페이지 맨 위에 몇 건 보여 주고, 목록에서 전체를 본다.
 * 관리 권한 `MANAGE_NOTICES` 를 받은 사람만 쓰고 내린다.
 */

export interface Notice {
  id: string;
  campusId: CampusId;
  title: string;
  body: string;
  /**
   * 위에 고정할지. 랜딩에서 먼저 보인다.
   * 전부 고정하면 고정의 의미가 없으므로 화면에서 개수를 제한한다.
   */
  pinned: boolean;
  /** 내렸는가. 지우지 않고 감춘다 — 무엇을 공지했는지 기록은 남아야 한다. */
  isPublished: boolean;
  authorUserId: UserId;
  createdAt: string;
  updatedAt: string;
}

/** 랜딩에 띄울 공지 최대 건수. 이보다 많으면 목록으로 보낸다. */
export const LANDING_NOTICE_LIMIT = 3;

/** 고정 공지가 먼저, 그다음 최신순. */
export function sortNotices(notices: readonly Notice[]): Notice[] {
  return [...notices].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
  );
}
