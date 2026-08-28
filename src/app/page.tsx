import { ArrowRight, LayoutGrid, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingArtwork } from '@/components/landing/landing-artwork';

/**
 * 랜딩 화면 (리뷰 2026-08-26 2절 · 2026-08-28 배치 수정).
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
 * ## 갈림길이 화면 맨 위에 온다
 *
 * 처음에는 그림을 머리에 두고 그 아래에 갈림길을 뒀는데, **눌러야 할 것이
 * 한 화면 밖으로 밀려났다.** 그림은 분위기를 만들 뿐 아무 데도 데려다주지
 * 않는다. 그래서 그림을 맨 아래로 내리고 버튼을 위로 올렸다.
 *
 * "어느 쪽으로 오셨나요?" 제목도 뺐다. 카드 두 장이 이미 그 질문을 하고
 * 있어서 같은 말을 한 번 더 하는 셈이었다.
 *
 * 아래에 있던 소개 카드 세 장("흩어진 도구를 한 곳에" 등)도 뺐다. 그림 안에
 * 같은 말이 이미 적혀 있었고, 그 자리 때문에 그림이 가로를 채우지 못했다.
 *
 * ## 한 화면에 담는다
 *
 * 스크롤해야 그림이 보이면 그림을 넣은 의미가 없다. 그래서 세로가 넉넉한
 * 화면(`lg` 이상)에서는 높이를 화면에 맞추고, 그림이 **남는 높이만** 차지하게
 * 한다. 위쪽 카드가 자리를 잡은 뒤 남는 만큼만 쓰므로 넘칠 일이 없다.
 *
 * 좁은 화면에서는 그대로 흐르게 둔다. 모바일에서 높이를 강제하면 주소
 * 표시줄이 오르내릴 때 내용이 잘린다.
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

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* 상단 바 — 사이드바가 없는 화면이라 여기서만 정체를 밝힌다 */}
      <header className="shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <span className="text-base font-bold text-fg">캠퍼스 자동화 관제 플랫폼</span>
          <Link
            href="/login"
            className="text-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            로그인
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-5 py-6 lg:min-h-0 lg:py-5">
        {/*
          화면 낭독기를 위한 제목.

          눈으로 보는 제목은 맨 아래 그림 안에 그려져 있는데, 낭독기는 그림 속
          글자를 읽지 못한다. 그래서 같은 말을 여기 남긴다.
        */}
        <h1 className="sr-only">
          나에게 필요한 도구를 찾아보자 — 교내에서 만든 AI·업무 자동화 도구를 한 곳에서
          찾고, 없으면 만들어 달라고 요청하는 곳입니다.
        </h1>

        {/* ------------------------------------------------------------------ */}
        {/* 갈림길 — 이 화면의 본론이라 맨 위에 온다                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="grid gap-3 md:grid-cols-2">
          {/*
            마법사를 왼쪽에 두고 색을 채운다.

            도움이 더 필요한 쪽이 먼저 보여야 한다. 흰 카드 두 장을 나란히
            두면 둘 다 안 눌린다 — 무엇을 권하는지 화면이 말하지 않기 때문이다.
          */}
          <Link
            href="/wizard"
            className="group flex flex-col gap-2 rounded-card bg-primary p-5 text-primary-fg shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-6" aria-hidden="true" />
              {/* 흰 글씨 위에 얹는 표시라 배경을 반투명 흰색으로 둔다 */}
              <span className="rounded-sm bg-white/20 px-2 py-0.5 text-xs font-semibold">
                추천
              </span>
            </div>

            <h2 className="text-lg font-bold sm:text-xl">맞춤 AI 찾기 마법사</h2>

            <p className="text-sm text-white/85">
              질문 다섯 개에 버튼으로 답하면 맞는 도구를 찾아 드립니다.
            </p>

            <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold">
              시작하기
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>

          <Link
            href="/home"
            className="group flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <LayoutGrid className="size-6 text-fg-muted" aria-hidden="true" />

            <h2 className="text-lg font-bold text-fg sm:text-xl">AI 플랫폼 들어가기</h2>

            <p className="text-sm text-fg-muted">
              등록된 도구와 올라온 수요를 바로 둘러봅니다.
            </p>

            <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold text-fg">
              둘러보기
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 그림 — 맨 아래. 분위기를 만들 뿐 어디로도 데려가지 않는다            */}
        {/* ------------------------------------------------------------------ */}
        {/*
          남은 높이를 그림이 가져간다.

          `flex-1 min-h-0` 이라 위쪽 카드들이 자리를 잡은 뒤 **남는 만큼만**
          차지한다. 그림이 커서 화면을 넘기는 일이 없다.

          `object-contain` 이라 비율은 그대로다 — 4:3 그림을 16:9 화면에 맞추면
          좌우가 남는데, 잘라내는 것보다 낫다. 그림 안에 제목이 그려져 있어서
          잘리면 글자가 사라진다.
        */}
        <section className="flex min-h-0 flex-1 items-center justify-center">
          <LandingArtwork
            slot="hero"
            src="/landing/hero.png"
            label="나에게 필요한 도구를 찾아보자 — 문제에 맞는 AI 도구를 쉽고 빠르게 추천해 드립니다."
            note="첫 화면 아래쪽에 들어갑니다."
            width={1447}
            height={1087}
            sizes="(min-width: 1024px) 1024px, 100vw"
            fit="contain"
          />
        </section>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-3.5 text-xs text-fg-subtle">
          충남대학교 캠퍼스 자동화 관제 플랫폼 · 교내 구성원용
        </div>
      </footer>
    </main>
  );
}
