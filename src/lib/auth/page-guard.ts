import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { DomainError } from '@/domain/shared/errors';

/**
 * 페이지 로딩 시 발생한 도메인 오류를 알맞은 화면으로 바꾼다.
 *
 * Server Component 안에서 그냥 던지면 500 오류 화면이 뜬다. 권한이 없거나
 * 없는 항목을 열었을 때 "서버 오류"가 나오는 것은 잘못된 안내다.
 *
 * **권한 없음을 404 로 보여주는 것은 의도적이다.** "권한이 없습니다"라고 알려 주면
 * 그 항목이 존재한다는 사실 자체가 새어 나간다. 목록에서 걸러진 항목의 주소를
 * 찍어 보며 존재 여부를 확인하는 것을 막는다.
 *
 * 서버 액션에는 쓰지 않는다. 액션은 `ActionResult` 로 오류를 돌려주어야
 * 폼이 어느 칸이 문제인지 표시할 수 있다.
 */
export async function guardPage<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof DomainError) {
      // redirect()/notFound() 는 각자의 특수 예외를 던지며 여기서 반환하지 않는다.
      if (error.code === 'UNAUTHENTICATED') redirect('/login');
      if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') notFound();
    }
    // 그 밖의 오류는 error.tsx 경계가 받는다.
    throw error;
  }
}
