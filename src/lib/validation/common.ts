import { z } from 'zod';
import { validationFailed } from '@/domain/shared/errors';
import { josa } from '@/domain/shared/josa';

/**
 * 폼 검증 공통 도구.
 *
 * 오류 메시지는 "무엇이 잘못됐는지 + 어떻게 고치는지" 두 부분으로 쓴다.
 * 화면에 그대로 나가는 문장이므로 개발자 용어를 쓰지 않는다.
 */

/** 비어 있어도 되는 텍스트. 앞뒤 공백은 항상 제거한다. */
export const optionalText = z.string().trim().default('');

/** 길이 제한이 있는 필수 텍스트. */
export function requiredText(label: string, min = 1, max = 2000) {
  return z
    .string()
    .trim()
    .min(min, min === 1 ? `${label}${josa(label, '을를')} 입력해 주세요.` : `${label}${josa(label, '을를')} ${min}자 이상 입력해 주세요.`)
    .max(max, `${label}${josa(label, '은는')} ${max}자까지 입력할 수 있습니다.`);
}

/**
 * 폼의 숫자 입력.
 *
 * 빈 칸·공백·숫자가 아닌 값은 전부 `null` 로 본다. 0 과 "입력하지 않음"은 다르므로
 * 0 을 기본값으로 채우지 않는다 — 비용 0원과 "비용 미파악"은 다른 의미다.
 */
export const nullableNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return null;
      const parsed = Number(trimmed.replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return Number.isFinite(value) ? value : null;
  })
  .refine((value) => value === null || value >= 0, {
    message: '0 이상의 숫자를 입력해 주세요.',
  });

/** 비어 있어도 되는 URL. */
export const optionalUrl = z
  .string()
  .trim()
  .default('')
  .refine((value) => value === '' || /^https?:\/\/\S+$/.test(value), {
    message: 'http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.',
  });

/** 문자열 배열 입력. 빈 항목과 중복은 제거한다. */
export const textList = z
  .array(z.string())
  .default([])
  .transform((values) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed === '' || seen.has(trimmed)) continue;
      seen.add(trimmed);
      result.push(trimmed);
    }
    return result;
  });

/** ZodError 를 필드 경로 → 메시지 맵으로 바꾼다. react-hook-form 이 그대로 쓴다. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    // 같은 필드에 여러 오류가 있으면 첫 번째만 보여준다. 한 번에 하나씩 고치게 하는 편이 낫다.
    if (path && !(path in fields)) fields[path] = issue.message;
  }
  return fields;
}

/** 검증에 실패하면 필드 오류를 담은 DomainError 를 던진다. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw validationFailed(toFieldErrors(result.error));
  }
  return result.data;
}
