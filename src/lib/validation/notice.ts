import { z } from 'zod';
import { optionalText, requiredText } from './common';

/** 공지 작성 (리뷰 1절) */
export const saveNoticeSchema = z.object({
  noticeId: optionalText,
  title: requiredText('공지 제목', 2, 150),
  body: requiredText('공지 내용', 5, 5000),
  /** 랜딩 맨 위에 고정할지 */
  pinned: z.boolean().default(false),
  /** 내리면 목록에서 감춘다. 지우지 않는다. */
  isPublished: z.boolean().default(true),
});
