import { expect, test } from '@playwright/test';
import { loginAs, mainContent, navigateTo, resetE2eData } from './helpers';

/**
 * 순위 화면과 AI 분석이 실제로 그려지는지 본다.
 *
 * 계산은 단위·통합 테스트가 본다. 여기서 확인하는 것은 **화면에 무엇이 보이는가**다.
 * 특히 판단마다 어느 모델이 언제 냈는지가 붙어 있는지 — 그게 빠지면 화면의
 * 숫자는 어디서 왔는지 알 수 없는 숫자가 된다.
 *
 * 데모 데이터에는 `pnpm ai:analyze` 로 미리 돌려 둔 진짜 분석이 들어 있다.
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

test('검토 화면에 중복·위험도·품질검증이 근거와 함께 뜬다', async ({ page }) => {
  await loginAs(page, '검토자');
  await navigateTo(page, '검토 작업');

  // 회의록 도구와 겹치도록 심어 둔 신청 건으로 들어간다.
  await mainContent(page).getByRole('link', { name: /미팅 노트 자동 정리기/ }).first().click();
  await page.waitForURL(/\/reviews\/[^/]+$/);

  const main = mainContent(page);

  /* ------------------------------------------------------------ 중복 탐지 */
  await expect(main.getByRole('heading', { name: /중복 자동화 탐지/ })).toBeVisible();
  // 판정과 처리 제안이 함께 뜬다. 점수만 보여 주면 그래서 뭘 하라는 건지 알 수 없다.
  await expect(main.getByText(/사실상 같은 도구/).first()).toBeVisible();
  await expect(main.getByText(/기존 도구에 합치기|기존 도구로 충분함/).first()).toBeVisible();
  // 겹치는 점과 다른 점을 나란히 둔다.
  await expect(main.getByText('겹치는 점').first()).toBeVisible();
  await expect(main.getByText('다른 점').first()).toBeVisible();

  /* --------------------------------------------------------- 위험도 평가 */
  await expect(main.getByRole('heading', { name: /위험도 자동 평가/ })).toBeVisible();
  // 체크리스트를 자동으로 채우지 않는다는 것을 화면이 말해야 한다.
  await expect(main.getByText(/확정 등급은 검토자가 정합니다/)).toBeVisible();

  /* ------------------------------------------------------ 멀티 LLM 검증 */
  await expect(main.getByRole('heading', { name: /멀티 LLM 품질검증/ })).toBeVisible();
  await expect(main.getByText(/서로 다른 모델 둘이/)).toBeVisible();

  /* ------------------------------------------------ 어느 모델이 언제 냈나 */
  // 판단마다 모델 이름이 붙는다. "AI 가 판단했습니다"만으로는 아무 말도 아니다.
  await expect(main.getByText('claude-opus-5').first()).toBeVisible();
  await expect(main.getByText(/아직 사람이 확인하지 않음/).first()).toBeVisible();
});

test('통합 표준화가 겹치는 도구를 묶어 기준과 흡수할 기능을 제시한다', async ({ page }) => {
  await loginAs(page, '관리자');
  await navigateTo(page, '관리');

  await page
    .getByRole('navigation', { name: '관리 메뉴' })
    .getByRole('link', { name: '통합 표준화' })
    .click();
  await page.waitForURL('**/admin/consolidation');

  const main = mainContent(page);

  await expect(main.getByRole('heading', { name: '통합 표준화' })).toBeVisible();
  await expect(main.getByText(/같은 일을 합니다/).first()).toBeVisible();

  // 기능 비교표가 실제로 그려진다.
  await expect(main.getByRole('table').first()).toBeVisible();

  // 어느 것을 기준으로 삼을지 제안하고, 그대로 개선 요청을 만들 수 있다.
  await expect(main.getByText(/기준으로 삼는 것을 권합니다/)).toBeVisible();
  await expect(
    main.getByRole('button', { name: '이 내용으로 개선 요청 만들기' }).first(),
  ).toBeVisible();

  // 어떻게 묶었는지를 화면에서 밝힌다.
  await expect(main.getByRole('heading', { name: /어떻게 묶었습니까/ })).toBeVisible();
});
