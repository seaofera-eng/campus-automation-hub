import { DomainError } from '@/domain/shared/errors';

/**
 * 서버 액션의 표준 반환 형식.
 *
 * 예외를 UI 로 그대로 던지지 않는다. 필드 단위 오류를 돌려주어야
 * react-hook-form 이 어느 입력칸이 문제인지 표시할 수 있다.
 */

export interface ActionError {
  code: string;
  message: string;
  /** 입력 필드별 오류 메시지 */
  fields?: Record<string, string>;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: ActionError): ActionResult<never> {
  return { ok: false, error };
}

/**
 * 액션 본문을 감싸 예외를 ActionResult 로 바꾼다.
 *
 * DomainError 는 사용자에게 보여줄 수 있도록 만든 메시지라 그대로 전달하고,
 * 그 외 예외는 내부 구조가 새어 나가지 않도록 일반 메시지로 바꾼다.
 * 원본은 서버 로그에만 남긴다.
 */
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await action());
  } catch (error) {
    if (error instanceof DomainError) {
      return fail({ code: error.code, message: error.message, fields: error.fields });
    }
    console.error('[action] 처리되지 않은 오류:', error);
    return fail({
      code: 'UNEXPECTED',
      message: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
}
