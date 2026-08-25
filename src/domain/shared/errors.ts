/**
 * 도메인 오류.
 *
 * 사용자에게 그대로 보여줄 수 있는 한국어 메시지를 담는다.
 * 요구사항 12번: 오류 메시지는 "무엇이 잘못됐는지 + 어떻게 해결하는지"까지 안내한다.
 */

export type DomainErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INVALID_STATUS_TRANSITION'
  | 'CONFLICT'
  | 'PRECONDITION_FAILED'
  | 'INTERNAL';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  /** 필드 단위 오류. 폼에 그대로 되돌려 준다. */
  readonly fields?: Record<string, string>;

  constructor(code: DomainErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    if (fields) this.fields = fields;
  }
}

export function unauthenticated(message = '로그인이 필요합니다. 먼저 로그인해 주세요.') {
  return new DomainError('UNAUTHENTICATED', message);
}

export function forbidden(
  message = '이 작업을 수행할 권한이 없습니다. 필요한 경우 관리자에게 권한을 요청해 주세요.',
) {
  return new DomainError('FORBIDDEN', message);
}

export function notFound(what = '요청한 항목') {
  return new DomainError(
    'NOT_FOUND',
    `${what}을(를) 찾을 수 없습니다. 이미 삭제되었거나 주소가 잘못되었을 수 있습니다.`,
  );
}

export function validationFailed(fields: Record<string, string>, message?: string) {
  return new DomainError(
    'VALIDATION_FAILED',
    message ?? '입력값을 다시 확인해 주세요. 아래 표시된 항목을 수정한 뒤 저장할 수 있습니다.',
    fields,
  );
}

export function conflict(message: string) {
  return new DomainError('CONFLICT', message);
}

export function preconditionFailed(message: string) {
  return new DomainError('PRECONDITION_FAILED', message);
}
