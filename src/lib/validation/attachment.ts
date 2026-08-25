import { z } from 'zod';
import { ATTACHMENT_KINDS } from '@/domain/tool/types';

/**
 * 첨부파일 제한 (요구사항 18번: 파일 업로드 유형과 크기를 제한한다).
 *
 * 허용 목록 방식이다. "위험한 것만 막기"는 새로운 형식이 나올 때마다 뚫리므로
 * 필요한 형식만 열어 둔다.
 *
 * SVG 는 스크립트를 품을 수 있어 이미지지만 허용하지 않는다.
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
