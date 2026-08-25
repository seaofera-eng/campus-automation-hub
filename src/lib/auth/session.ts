import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '../config/env';

/**
 * DEMO 모드 세션 쿠키의 서명·검증.
 *
 * 쿠키 값은 `<base64url(payload)>.<base64url(hmac)>` 형식이다.
 * 서명이 없으면 브라우저에서 쿠키를 고쳐 다른 사용자로 위장할 수 있으므로,
 * DEMO 모드라도 서명을 생략하지 않는다.
 *
 * ⚠️ 이것은 **데모 전용**이다. 실제 운영 인증은 Supabase Auth 가 담당한다.
 *    비밀번호를 다루지 않고 만료도 짧게 잡는다.
 */

export const SESSION_COOKIE_NAME = 'campus_demo_session';

/** 8시간. 데모 세션이 오래 남아 있을 이유가 없다. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export interface DemoSessionPayload {
  /** 사용자 ID */
  sub: string;
  /** 발급 시각 (epoch seconds) */
  iat: number;
  /** 만료 시각 (epoch seconds) */
  exp: number;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(data: string): string {
  return createHmac('sha256', serverEnv().demoSessionSecret).update(data).digest('base64url');
}

export function createSessionValue(userId: string, now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  const payload: DemoSessionPayload = {
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

/**
 * 쿠키 값을 검증한다. 서명 불일치·형식 오류·만료는 전부 null 로 돌려준다.
 * 왜 실패했는지는 호출자에게 알리지 않는다 — 공격자에게 힌트가 된다.
 */
export function readSessionValue(value: string | undefined, now = Date.now()): string | null {
  if (!value) return null;

  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;

  const encoded = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(encoded);

  // 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 확인한다.
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(decode(encoded)) as Partial<DemoSessionPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 <= now) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** 쿠키 설정 옵션. HttpOnly 라서 스크립트로 읽을 수 없다. */
export function sessionCookieOptions(): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
