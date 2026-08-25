import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv } from '@/lib/config/env';

/**
 * Supabase 클라이언트.
 *
 * 두 종류를 명확히 구분한다.
 *
 *  - getUserClient(): 로그인한 사용자의 쿠키 세션으로 동작한다. **RLS가 적용된다.**
 *    일반적인 조회·수정은 전부 이쪽을 쓴다.
 *
 *  - getServiceClient(): service_role 키로 동작해 **RLS를 우회한다.**
 *    감사 로그 기록처럼 사용자 권한과 무관하게 반드시 남겨야 하는 작업에만 쓴다.
 *    이 키는 절대 클라이언트 번들에 들어가면 안 된다.
 */

export async function getUserClient(): Promise<SupabaseClient> {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component 에서는 쿠키를 쓸 수 없다.
          // 세션 갱신은 미들웨어가 담당하므로 여기서는 무시해도 안전하다.
        }
      },
    },
  });
}

let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const env = publicEnv();
  const secrets = serverEnv();

  if (!secrets.supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. 감사 로그 기록에는 서버 전용 키가 필요합니다.',
    );
  }

  serviceClient = createClient(env.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/** Supabase 오류를 도메인 오류 메시지로 바꿔 던진다. */
export function throwOnError(error: { message: string; code?: string } | null, what: string): void {
  if (!error) return;
  // 원본 메시지에는 내부 구조가 드러날 수 있으므로 서버 로그로만 남긴다.
  console.error(`[supabase] ${what} 실패:`, error.message, error.code ?? '');
  throw new Error(`${what} 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.`);
}
