/**
 * 한국어 조사 선택.
 *
 * 도구 이름이나 수요 제목처럼 값이 문장 안에 들어가는 자리에서 "은(는)" 같은
 * 자리표시자가 화면에 그대로 나가지 않도록, 앞 낱말의 받침을 보고 조사를 고른다.
 *
 * 의존성 0 을 지켜야 하므로 순수 함수로 둔다. domain 안에서도 부를 수 있다.
 */

export type JosaPair = '은는' | '이가' | '을를' | '과와';

/** 받침이 있을 때 / 없을 때 쓰는 조사 */
const FORMS: Record<JosaPair, readonly [withFinal: string, withoutFinal: string]> = {
  은는: ['은', '는'],
  이가: ['이', '가'],
  을를: ['을', '를'],
  과와: ['과', '와'],
};

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/**
 * 숫자를 소리 내어 읽었을 때 받침이 있는지.
 * 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 은 받침이 있고 나머지는 없다.
 */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  '0': true,
  '1': true,
  '2': false,
  '3': true,
  '4': false,
  '5': false,
  '6': true,
  '7': true,
  '8': true,
  '9': false,
};

/**
 * 알파벳을 한글 이름으로 읽었을 때 받침이 있는 것들.
 * L 엘 · M 엠 · N 엔 · R 알 만 해당한다. (나머지는 모두 모음으로 끝난다)
 */
const LETTERS_WITH_FINAL = new Set(['l', 'm', 'n', 'r']);

/**
 * 조사를 붙일 낱말의 마지막 글자에 받침이 있는지 판단한다.
 * 판단할 수 없으면 null 을 돌려준다.
 */
function hasFinalConsonant(word: string): boolean | null {
  // 따옴표·괄호·공백처럼 소리 나지 않는 글자는 건너뛰고 실제 낱말의 끝을 찾는다.
  const trimmed = word.replace(/[\s'"’”)\]}.·,]+$/u, '');
  const last = trimmed.at(-1);
  if (last === undefined) return null;

  const code = last.codePointAt(0);
  if (code === undefined) return null;

  if (code >= HANGUL_START && code <= HANGUL_END) {
    return (code - HANGUL_START) % 28 !== 0;
  }

  const digit = DIGIT_HAS_FINAL[last];
  if (digit !== undefined) return digit;

  const lower = last.toLowerCase();
  if (lower >= 'a' && lower <= 'z') return LETTERS_WITH_FINAL.has(lower);

  return null;
}

/**
 * 낱말 뒤에 붙일 조사를 고른다.
 *
 * 판단할 수 없는 글자로 끝나면 받침이 없는 쪽을 쓴다. "는·가·를·와" 가
 * 어느 쪽에 붙어도 "은(는)" 같은 자리표시자보다는 읽기 낫다.
 *
 * @example josa('도구', '은는')  // '는'
 * @example josa('회의록', '이가') // '이'
 */
export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal] = FORMS[pair];
  return hasFinalConsonant(word) === true ? withFinal : withoutFinal;
}

/** 낱말과 조사를 이어 붙인다. `${withJosa('도구', '은는')}` → '도구는' */
export function withJosa(word: string, pair: JosaPair): string {
  return `${word}${josa(word, pair)}`;
}
