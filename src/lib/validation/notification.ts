import { z } from 'zod';

/** 알림 읽음 처리 (리뷰 2026-08-28 5절). 알림 하나만 지목하면 된다. */
export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1),
});
