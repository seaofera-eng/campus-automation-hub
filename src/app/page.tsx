import { ArrowRight, LayoutGrid, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingArtwork } from '@/components/landing/landing-artwork';
import { SignalLine } from '@/components/ui/signal-line';

/**
 * 랜딩 화면 (리뷰 2026-08-26 2절).
 *
 * "랜딩페이지를 별도로 가져가고 첫 화면에서부터 'AI 플랫폼 들어가기'와
 *  '맞춤 AI 찾기 마법사'를 선택해서 안내를 해주는 형태가 좋겠어."
 *
 * ## 왜 갈림길을 먼저 두는가
 *
 * 들어오는 사람은 두 부류다. **뭐가 있는지 보러 온 사람**과 **자기 일이
 * 힘들어서 온 사람**이다. 지금까지는 둘 다 목록으로 떨어뜨렸는데, 뒤쪽
 * 사람에게 목록은 아무 도움이 안 된다. 자기 업무를 검색어로 바꿀 줄 알아야
 * 쓸 수 있기 때문이다.
 *
 * 그래서 첫 화면에서 갈라 준다. 목록으로 갈 사람은 목록으로, 자기 일을
 * 들고 온 사람은 마법사로 보낸다.
 *
 * ## 로그인을 요구하지 않는다
 *
 * 이 화면은 `(app)` 밖에 있어서 사이드바도 세션도 없다. 두 버튼 모두
 * 누르면 그때 로그인 화면으로 간다. 첫 화면부터 로그인을 요구하면
 * "여기가 뭐 하는 곳인지" 볼 기회 자체가 없어진다.
 */

export const metadata: Metadata = {
  title: '캠퍼스 자동화 관제 플랫폼',
};

const HIGHLIGHTS = [
  {
    title: '흩어진 도구를 한 곳에',
    body: '학과·부서마다 따로 만들던 자동화 도구를 한 곳에 모읍니다. 같은 것을 두 번 만들지 않습니다.',
  },
  {
    title: '쓰기 전에 확인합니다',
    body: '어떤 자료를 다루는지, 사람이 확인하는 단계가 있는지 검토를 거친 도구만 올라옵니다.',
  },
  {
    title: '쓴 사람이 남긴 평가',
    body: '실제로 써 본 사람의 평가와 개선 요청이 쌓입니다. 점수는 익명입니다.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      {/* 상단 바 — 사이드바가 없는 화면이라 여기서만 정체를 밝힌다 */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="text-base font-bold text-fg">캠퍼스 자동화 관제 플랫폼</span>
          <Link
            href="/login"
            className="text-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            로그인
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        {/* ------------------------------------------------------------------ */}
        {/* 소개                                                                */}
        {/* ------------------------------------------------------------------ */}
        {/*
          받은 그림에 제목("나에게 필요한 도구를 찾아보자!")과 설명이 **그림
          안에** 그려져 있다. 그래서 옆에 HTML 제목을 또 두지 않는다 — 두 벌이
          나란히 있으면 어느 쪽을 읽어야 할지 헷갈린다.

          대신 그림을 이 화면의 머리로 크게 쓰고, 화면 낭독기를 위해 같은
          문장을 `sr-only` 제목과 `alt` 에 남긴다. **그림이 안 떠도 무슨
          화면인지는 남는다.**
        */}
        <section className="flex flex-col items-center gap-4">
          <span className="w-fit rounded-sm border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
            충남대학교
          </span>

          <h1 className="sr-only">
            나에게 필요한 도구를 찾아보자 — 교내에서 만든 AI·업무 자동화 도구를 한 곳에서
            찾고, 없으면 만들어 달라고 요청하는 곳입니다.
          </h1>

          <div className="w-full max-w-3xl">
            <LandingArtwork
              slot="hero"
              src="/landing/hero.png"
              label="나에게 필요한 도구를 찾아보자 — 문제에 맞는 AI 도구를 쉽고 빠르게 추천해 드립니다."
              note="첫 화면 머리에 들어갑니다."
              width={1447}
              height={1087}
              priority
              sizes="(min-width: 768px) 768px, 100vw"
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 갈림길 — 이 화면의 본론                                             */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-12 sm:mt-16">
          <div className="flex items-start gap-3">
            <SignalLine className="min-h-11" />
            <div>
              <h2 className="text-lg font-bold text-fg">어느 쪽으로 오셨나요?</h2>
              <p className="mt-1 text-sm text-fg-muted">
                둘 중 아무거나 골라도 됩니다. 나중에 서로 오갈 수 있습니다.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {/* 마법사를 왼쪽에 둔다. 도움이 더 필요한 쪽이 먼저 보여야 한다. */}
            <Link
              href="/wizard"
              className="group flex flex-col gap-4 rounded-card border-2 border-primary bg-surface p-6 shadow-card transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-fg">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <span className="rounded-sm bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                  추천
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-fg">맞춤 AI 찾기 마법사</h3>
                <p className="mt-1.5 text-sm text-fg-muted">
                  질문 다섯 개에 버튼으로 답하면 맞는 도구를 찾아 드립니다. 없으면 그
                  자리에서 만들어 달라고 요청할 수 있습니다.
                </p>
              </div>

              <ul className="flex flex-col gap-1 text-sm text-fg-muted">
                <li>· 글로 설명하지 않아도 됩니다</li>
                <li>· 2분이면 끝납니다</li>
                <li>· 신청서는 고르신 내용으로 대신 써 드립니다</li>
              </ul>

              <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary">
                시작하기
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>

            <Link
              href="/home"
              className="group flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
                <LayoutGrid className="size-5" aria-hidden="true" />
              </span>

              <div>
                <h3 className="text-base font-bold text-fg">AI 플랫폼 들어가기</h3>
                <p className="mt-1.5 text-sm text-fg-muted">
                  등록된 도구 목록, 올라온 수요, 순위와 관리 화면으로 바로 들어갑니다.
                </p>
              </div>

              <ul className="flex flex-col gap-1 text-sm text-fg-muted">
                <li>· 이미 무엇을 찾는지 아는 경우</li>
                <li>· 도구를 만들어 올리려는 경우</li>
                <li>· 검토·관리 업무를 하는 경우</li>
              </ul>

              <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold text-fg">
                둘러보기
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 무엇을 하는 곳인가                                                  */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-12 sm:mt-16">
          <div className="grid gap-5 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="rounded-card border border-border bg-surface p-5">
                <h3 className="text-sm font-bold text-fg">{item.title}</h3>
                <p className="mt-1.5 text-sm text-fg-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-fg-subtle">
          충남대학교 캠퍼스 자동화 관제 플랫폼 · 교내 구성원용
        </div>
      </footer>
    </main>
  );
}
