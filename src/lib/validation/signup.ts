import { z } from 'zod';
import { MEMBER_TYPES } from '@/domain/authz/accounts';
import { optionalText, requiredText } from './common';

/**
 * 회원가입 (리뷰 2절).
 *
 * 비밀번호를 받지 않는다. SSO 가 들어올 자리라 지금 흉내 내지 않는다.
 */
export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, '이메일을 입력해 주세요.')
    .email('올바른 이메일 주소를 입력해 주세요.'),
  name: requiredText('이름', 2, 50),
  memberType: z.enum(MEMBER_TYPES),
  title: optionalText.pipe(z.string().max(100, '소속·직위는 100자까지 입력할 수 있습니다.')),
});
