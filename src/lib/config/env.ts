import { z } from 'zod';

/**
 * 환경변수 파싱.
 *
 * 서버 전용 값과 클라이언트 노출 값을 명확히 나눈다.
 * `NEXT_PUBLIC_` 접두어가 붙은 값만 브라우저 번들에 들어간다.
 *
 * ⚠️ SUPABASE_SERVICE_ROLE_KEY 는 RLS를 우회하므로 절대 클라이언트로 나가면 안 된다.
 *    이 파일의 serverEnv()는 서버에서만 호출한다.
 */

/** Next.js는 빌드 시 `process.env.NEXT_PUBLIC_*` 를 문자열 리터럴로 치환한다.
 *  따라서 동적 접근이 아니라 반드시 정적으로 읽어야 한다. */
const publicSchema = z.object({
  demoMode: z.boolean(),
  appUrl: z.string().url(),
  supabaseUrl: z.string().url().or(z.literal('')),
  supabaseAnonKey: z.string(),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cachedPublicEnv: PublicEnv | null = null;

export function publicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const parsed = publicSchema.safeParse({
    // DEMO_MODE 가 명시적으로 'false' 인 경우에만 Supabase 모드로 본다.
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  });

  if (!parsed.success) {
    throw new Error(
      `환경변수 설정이 올바르지 않습니다. .env.example 을 참고해 .env.local 을 확인해 주세요.\n${parsed.error.message}`,
    );
  }

  cachedPublicEnv = parsed.data;
  return parsed.data;
}

export function isDemoMode(): boolean {
  return publicEnv().demoMode;
}

/* -------------------------------------------------------------------------- */
/* 서버 전용                                                                   */
/* -------------------------------------------------------------------------- */

const serverSchema = z.object({
  demoSessionSecret: z
    .string()
    .min(16, 'DEMO_SESSION_SECRET 은 16자 이상이어야 합니다. .env.local 에 값을 설정해 주세요.'),
  supabaseServiceRoleKey: z.string(),
  supabaseStorageBucket: z.string(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse({
    demoSessionSecret:
      process.env.DEMO_SESSION_SECRET ??
      // 개발 편의를 위한 폴백. 운영에서는 반드시 환경변수를 설정해야 한다.
      'insecure-development-only-demo-secret',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'tool-attachments',
  });

  if (!parsed.success) {
    throw new Error(`서버 환경변수 설정이 올바르지 않습니다.\n${parsed.error.message}`);
  }

  cachedServerEnv = parsed.data;
  return parsed.data;
}

/** Supabase 모드로 동작할 준비가 되었는지 확인한다. */
export function assertSupabaseConfigured(): void {
  const pub = publicEnv();
  if (!pub.supabaseUrl || !pub.supabaseAnonKey) {
    throw new Error(
      'Supabase 연결정보가 없습니다. NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하거나, NEXT_PUBLIC_DEMO_MODE=true 로 DEMO 모드를 사용해 주세요.',
    );
  }
}

/** 테스트에서 캐시를 비운다. */
export function resetEnvCache(): void {
  cachedPublicEnv = null;
  cachedServerEnv = null;
}
