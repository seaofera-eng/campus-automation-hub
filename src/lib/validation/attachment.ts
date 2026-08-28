import { z } from 'zod';
import { ATTACHMENT_KINDS } from '@/domain/tool/types';

/**
 * 첨부파일 제한 (요구사항 18번: 파일 업로드 유형과 크기를 제한한다).
 *
 * 허용 목록 방식이다. "위험한 것만 막기"는 새로운 형식이 나올 때마다 뚫리므로
 * 필요한 형식만 열어 둔다.
 *
 * SVG 는 스크립트를 품을 수 있어 이미지지만 허용하지 않는다.
 *
 * ## 프로그램 파일 (리뷰 2026-08-27 3절)
 *
 * "파일이든, URL이든 연결시켜야하는데 그것을 넣을 수 있는 칸이 없음."
 *
 * 그래서 압축 파일(zip)과 엑셀 매크로(xlsm)를 열었다. **실행 파일(.exe)은
 * 열지 않는다.** 학내 플랫폼에서 exe 를 그대로 받아 돌리게 하면, 검토를
 * 통과한 파일과 누군가 바꿔치기한 파일을 사용자가 구분할 방법이 없다.
 * 압축해서 올리면 최소한 받는 사람이 열어 보고 판단할 기회가 생긴다.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB — DB 제약과 같은 값

export const ALLOWED_ATTACHMENT_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  // 프로그램 파일. 브라우저마다 zip 을 두 가지 중 하나로 보낸다.
  // `application/octet-stream` 은 열지 않는다 — exe 도 그 값으로 오기 때문에
  // 열어 두면 위의 exe 금지가 무의미해진다.
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  // 엑셀 매크로. 학내에서 제일 흔한 자동화 형태다.
  'application/vnd.ms-excel.sheet.macroEnabled.12': 'xlsm',
};

export const ATTACHMENT_ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_ATTACHMENT_TYPES).join(',');

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 저장할 파일 이름을 안전하게 만든다.
 *
 * 경로 구분자와 제어문자를 제거해 저장소 경로를 벗어나지 못하게 한다.
 * 한글 파일명은 그대로 두어 사용자가 알아볼 수 있게 한다.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';

  // 제어문자(U+0000~U+001F)와 파일 시스템 예약문자를 제거한다. 한글은 그대로 둔다.
  const reserved = new Set(['<', '>', ':', '"', '|', '?', '*', '\\', '/']);
  let cleaned = '';
  for (const character of base) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) continue;
    if (reserved.has(character)) continue;
    cleaned += character;
  }

  const limited = cleaned.trim().slice(0, 120);
  return limited === '' || limited === '.' || limited === '..' ? 'file' : limited;
}

export const attachmentMetaSchema = z.object({
  toolId: z.string().min(1),
  kind: z.enum(ATTACHMENT_KINDS),
  fileName: z.string().min(1, '파일 이름을 확인할 수 없습니다.'),
  mimeType: z
    .string()
    .refine((value) => value in ALLOWED_ATTACHMENT_TYPES, {
      message: `허용되지 않는 파일 형식입니다. ${Object.values(ALLOWED_ATTACHMENT_TYPES).join(', ')} 형식만 올릴 수 있습니다.`,
    }),
  byteSize: z
    .number()
    .int()
    .positive('빈 파일은 올릴 수 없습니다.')
    .max(
      MAX_ATTACHMENT_BYTES,
      `파일 크기는 ${humanFileSize(MAX_ATTACHMENT_BYTES)} 까지만 올릴 수 있습니다. 파일을 나누거나 압축해 주세요.`,
    ),
});

export const removeAttachmentSchema = z.object({
  toolId: z.string().min(1),
  attachmentId: z.string().min(1),
});

/** 수요 첨부 (리뷰 6.4절). 도구 첨부와 같은 형식·크기 규칙을 씁니다. */
export const demandAttachmentMetaSchema = z.object({
  demandId: z.string().min(1),
  fileName: z.string().min(1, '파일 이름을 읽을 수 없습니다.'),
  mimeType: z
    .string()
    .min(1, '파일 형식을 읽을 수 없습니다.')
    .refine((value) => value in ALLOWED_ATTACHMENT_TYPES, {
      message: `허용되지 않는 파일 형식입니다. ${Object.values(ALLOWED_ATTACHMENT_TYPES).join(', ')} 형식만 올릴 수 있습니다.`,
    }),
  byteSize: z
    .number()
    .int()
    .positive('빈 파일은 올릴 수 없습니다.')
    .max(
      MAX_ATTACHMENT_BYTES,
      `파일 크기는 ${humanFileSize(MAX_ATTACHMENT_BYTES)} 까지만 올릴 수 있습니다. 파일을 나누거나 압축해 주세요.`,
    ),
});

export const removeDemandAttachmentSchema = z.object({
  demandId: z.string().min(1),
  attachmentId: z.string().min(1),
});
