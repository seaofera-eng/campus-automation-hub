import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * E2E 공통 도우미.
 *
 * DEMO 모드에는 비밀번호가 없으므로 로그인은 계정 카드를 누르는 것으로 끝난다.
 */

/**
 * 데모 계정.
 *
 * 이제 역할이 아니라 **권한**으로 나뉜다.
 *   이용자   김개발 · 박수요 — 관리 권한 없음. 도구도 만들고 수요도 올린다.
 *   검토자   이검토 — 검토 권한만 가진 관리자
 *   관리자   최관리 — 모든 관리 권한
 */
export type DemoRole = '이용자' | '다른이용자' | '검토자' | '관리자';

export const DEMO_USERS: Record<DemoRole, string> = {
  이용자: '김개발',
  다른이용자: '박수요',
  검토자: '이검토',
  관리자: '최관리',
};

/** E2E 전용 데이터 디렉터리를 지운다. 다음 요청에서 시드가 다시 만들어진다. */
export function resetE2eData(): void {
  rmSync(resolve(process.cwd(), '.data-e2e'), { recursive: true, force: true });
}

export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  await page.goto('/login');

  // 이미 로그인되어 있으면 홈으로 튕긴다. 그 경우 먼저 로그아웃한다.
  if (!page.url().includes('/login')) {
    await logout(page);
    await page.goto('/login');
  }

  const name = DEMO_USERS[role];
  await page.getByRole('button', { name: new RegExp(name) }).click();
  // 첫 화면은 대시보드가 아니라 랜딩이다.
  await page.waitForURL('**/home');
  await expect(page.getByRole('heading', { name: /필요한 도구를 찾고/ })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: '로그아웃' });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForURL('**/login');
  }
}

const MENU_PATHS: Record<string, string> = {
  홈: '/home',
  대시보드: '/dashboard',
  '자동화 도구': '/tools',
  '업무 수요': '/demands',
  '도구 순위': '/ranking',
  '검토 작업': '/reviews',
  '개선 요청': '/improvements',
  공지: '/notices',
  관리: '/admin',
};

/**
 * 사이드바 메뉴로 이동한다.
 *
 * 이동이 **끝날 때까지 기다린다.** 기다리지 않으면 다음 단계의 셀렉터가
 * 이전 화면(예: 대시보드의 최근 활동 목록)에서 엉뚱한 요소를 잡는다.
 */
export async function navigateTo(page: Page, menu: keyof typeof MENU_PATHS): Promise<void> {
  await page
    .getByRole('navigation', { name: '주요 메뉴' })
    .first()
    .getByRole('link', { name: menu, exact: true })
    .click();

  const path = MENU_PATHS[menu];
  if (path) await page.waitForURL(`**${path}`);
}

/** 본문 영역으로 범위를 좁힌다. 사이드바·최근 활동과 겹치는 이름을 피한다. */
export function mainContent(page: Page) {
  return page.locator('#main-content');
}
