/**
 * 날짜·시각 표시.
 *
 * 화면에 나가는 모든 날짜는 여기를 거친다.
 *
 * `timeStyle: 'short'` 만 주면 Node 의 ICU 버전에 따라 "오전"이 아니라 "AM" 으로
 * 나오는 구간이 있다 (실제로 Node 24.14 에서 "2026. 8. 22. AM 10:19" 로 나갔다).
 * 서버에서 렌더하므로 사용자에게 그대로 보인다. `hour12: false` 를 명시해
 * 오전/오후 표기 자체를 쓰지 않고 24시간제로 고정한다.
 */

const LOCALE = 'ko-KR';

const DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: false,
});

const DATE_ONLY = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** "2026. 8. 22. 14:19" */
export function formatDateTime(value: string | Date): string {
  return DATE_TIME.format(toDate(value));
}

/** "2026년 8월 22일" — 시각이 의미 없는 마감일·목표일에 쓴다. */
export function formatDate(value: string | Date): string {
  return DATE_ONLY.format(toDate(value));
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
