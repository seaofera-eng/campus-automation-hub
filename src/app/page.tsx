import { redirect } from 'next/navigation';

/**
 * 첫 화면은 랜딩이다 (리뷰 1절·13절).
 * 대시보드는 사이드바에서 따로 들어간다.
 */
export default function RootPage() {
  redirect('/home');
}
