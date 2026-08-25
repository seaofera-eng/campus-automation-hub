import 'server-only';
import type { Notice } from '@/domain/notice/types';
import { sortNotices } from '@/domain/notice/types';
import type { CampusId } from '@/domain/shared/ids';
import type { NoticeRepository } from '../types';
import { getUserClient, throwOnError } from './client';
import { toNotice } from './mappers';

/**
 * 공지 (Supabase).
 *
 * ⚠️ 이 구현은 실제 Supabase 프로젝트에 연결해 검증한 적이 없다.
 */
export function createSupabaseNoticeRepository(): NoticeRepository {
  return {
    async list(campusId: CampusId, includeUnpublished: boolean): Promise<Notice[]> {
      const supabase = await getUserClient();
      let query = supabase.from('notices').select('*').eq('campus_id', campusId);
      if (!includeUnpublished) query = query.eq('is_published', true);

      const { data, error } = await query;
      throwOnError(error, '공지 조회');
      return sortNotices((data ?? []).map(toNotice));
    },

    async get(id: string): Promise<Notice | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase.from('notices').select('*').eq('id', id).maybeSingle();
      throwOnError(error, '공지 조회');
      return data ? toNotice(data) : null;
    },

    async upsert(notice: Notice): Promise<Notice> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('notices')
        .upsert({
          id: notice.id,
          campus_id: notice.campusId,
          title: notice.title,
          body: notice.body,
          pinned: notice.pinned,
          is_published: notice.isPublished,
          author_user_id: notice.authorUserId,
          created_at: notice.createdAt,
          updated_at: notice.updatedAt,
        })
        .select('*')
        .single();
      throwOnError(error, '공지 저장');
      return toNotice(data);
    },
  };
}
