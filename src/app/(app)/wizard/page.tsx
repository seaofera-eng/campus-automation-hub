import type { Metadata } from 'next';
import { loadNewDemandForm } from '@/application/demands/query';
import { WizardFlow } from '@/components/wizard/wizard-flow';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: '맞춤 AI 찾기' };

/**
 * 맞춤 AI 찾기 마법사 (리뷰 2026-08-26 2절).
 *
 * 로그인만 확인하고 나머지는 클라이언트가 맡는다. 다섯 단계 사이를 오갈 때마다
 * 서버를 다녀오면 흐름이 끊긴다. 실제 작업(도구 찾기·초안 작성·수요 등록)은
 * 전부 서버 액션으로 나가고, 거기서 권한을 다시 확인한다.
 *
 * `<Suspense>` 로 감싸지 않는다 — 권한 검사가 로딩 경계 안으로 들어가면
 * 404 가 200 으로 나간다 (CLAUDE.md 라우팅 항목).
 */
export default async function WizardPage() {
  await guardPage(loadNewDemandForm);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <WizardFlow />
    </div>
  );
}
