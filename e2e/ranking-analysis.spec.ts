import { expect, test } from '@playwright/test';
import { loginAs, mainContent, navigateTo, resetE2eData } from './helpers';

/**
 * 순위 화면과 AI 분석 자리가 실제로 그려지는지 본다.
 *
 * 계산은 단위·통합 테스트가 본다. 여기서 확인하는 것은 화면이다 —
 * 특히 **분석이 없을 때 숫자를 지어내지 않는지**. 그건 서버에서 값을
 * 만들어 내는 문제가 아니라 화면이 0 으로 채우는 문제라 여기서만 잡힌다.
 */

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  resetE2eData();
});

test('순위 화면은 총점만이 아니라 계산 근거를 보여 준다', async ({ page }) => {
  await loginAs(page, '이용자');
  await navigateTo(page, '도구 순위');

  const main = mainContent(page);

  await expect(main.getByRole('heading', { name: '도구 순위' })).toBeVisible();

  // 축 이름이 그대로 보인다. 총점 하나로 끝내지 않는다.
  await expect(main.getByText('만족도').first()).toBeVisible();
  await expect(main.getByText('실제 쓰임').first()).toBeVisible();

  // 가중치를 화면에 적는다. 심사에서도, 도구를 만든 사람에게도 필요하다.
  await expect(main.getByRole('heading', { name: /어떻게 계산했습니까/ })).toBeVisible();
  await expect(main.getByText(/AI 를 쓰지 않습니다/)).toBeVisible();
});

test('분석을 돌리지 않았으면 점수를 지어내지 않는다', async ({ page }) => {
  await loginAs(page, '검토자');
  await navigateTo(page, '검토 작업');

  // 검토 큐의 첫 건으로 들어간다. 도구 이름이 그대로 링크다.
  await mainContent(page).locator('a[href^="/reviews/"]').first().click();
  await page.waitForURL(/\/reviews\/[^/]+$/);

  const main = mainContent(page);

  // 아직 pnpm ai:analyze 를 돌리지 않은 상태다.
  await expect(main.getByText(/중복 자동화 탐지를 아직 돌리지 않았습니다/)).toBeVisible();
  await expect(
    main.getByText(/표시할 점수나 판정을 임의로 만들지 않습니다/).first(),
  ).toBeVisible();
});
