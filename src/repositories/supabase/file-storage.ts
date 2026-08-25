import 'server-only';
import { serverEnv } from '@/lib/config/env';
import type { FileStorage } from '../types';
import { getUserClient, throwOnError } from './client';

/**
 * Supabase Storage 기반 첨부파일 저장소.
 *
 * 버킷은 **비공개**를 전제로 한다. 따라서 `getUrl()` 은 공개 URL 이 아니라
 * 짧은 수명의 서명 URL 을 발급한다. 첨부에 개인정보가 포함될 수 있으므로
 * 링크만 알면 누구나 여는 상태가 되어서는 안 된다.
 *
 * 버킷 생성은 SQL 마이그레이션 범위 밖이라 `docs/SETUP.md` 의 수동 절차로 안내한다.
 */

function bucket(): string {
  return serverEnv().supabaseStorageBucket;
}

/** 서명 URL 유효 시간(초). 화면을 여는 동안만 유효하면 충분하다. */
const SIGNED_URL_TTL_SECONDS = 300;

export function createSupabaseFileStorage(): FileStorage {
  return {
    async save(path: string, data: Uint8Array, contentType: string): Promise<string> {
      const supabase = await getUserClient();
      const { error } = await supabase.storage.from(bucket()).upload(path, data, {
        contentType,
        // 같은 경로에 덮어쓰지 않는다. 경로에 버전 식별자를 포함해 호출한다.
        upsert: false,
      });
      throwOnError(error, '첨부파일 저장');
      return path;
    },

    async getUrl(path: string): Promise<string> {
      const supabase = await getUserClient();
      const { data, error } = await supabase.storage
        .from(bucket())
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      throwOnError(error, '첨부파일 주소 발급');
      if (!data?.signedUrl) {
        throw new Error('첨부파일 주소를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
      return data.signedUrl;
    },

    async remove(path: string): Promise<void> {
      const supabase = await getUserClient();
      const { error } = await supabase.storage.from(bucket()).remove([path]);
      throwOnError(error, '첨부파일 삭제');
    },
  };
}
