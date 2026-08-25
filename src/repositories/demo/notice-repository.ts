import 'server-only';
import type { Notice } from '@/domain/notice/types';
import { sortNotices } from '@/domain/notice/types';
import type { CampusId } from '@/domain/shared/ids';
import type { NoticeRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

/**
 * 공지 (DEMO).
 *
 * 내린 공지는 지우지 않고 `isPublished` 로 감춘다. 무엇을 공지했는지는
 * 나중에 확인할 수 있어야 한다.
 */
export function createNoticeRepository(): NoticeRepository {
  return {
    async list(campusId: CampusId, includeUnpublished: boolean): Promise<Notice[]> {
      const db = await loadDb();
      const rows = db.notices.filter(
        (notice) => notice.campusId === campusId && (includeUnpublished || notice.isPublished),
      );
      return clone(sortNotices(rows));
    },

    async get(id: string): Promise<Notice | null> {
      const db = await loadDb();
      const found = db.notices.find((notice) => notice.id === id);
      return found ? clone(found) : null;
    },

    async upsert(notice: Notice): Promise<Notice> {
      return mutateDb((db) => {
        const index = db.notices.findIndex((row) => row.id === notice.id);
        if (index >= 0) db.notices[index] = clone(notice);
        else db.notices.push(clone(notice));
        return clone(notice);
      });
    },
  };
}
