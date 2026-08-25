import { expect, test } from '@playwright/test';
import { loginAs, logout, mainContent, navigateTo, resetE2eData } from './helpers';

/**
 * 요구사항 19번의 8단계 시나리오를 하나로 이어 붙인 E2E 테스트.
 *
 * 개발자 로그인 → 도구 등록 → 리뷰어 보완요청 → 개발자 수정/재제출
 * → 리뷰어 시범운영 승인 → 수요자 평가 → 수요자 개선요청 → 관리자 확인
 *
 * 앞 단계의 결과가 뒷 단계의 입력이므로 하나의 test 로 순서대로 실행한다.
 * (테스트를 쪼개면 Playwright 가 순서를 보장하지 않고 상태 공유도 어렵다.)
 */

const TOOL_NAME = `E2E 회의록 정리 도구 ${Date.now()}`;

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  resetE2eData();
});

test('전체 업무 흐름: 등록 → 검토 → 보완 → 승인 → 평가 → 개선요청 → 관리자 확인', async ({
  page,
}) => {
  /* ---------------------------------------------------------------- 1. 로그인 */
  await test.step('이용자로 로그인하면 랜딩이 먼저 뜬다', async () => {
    await loginAs(page, '이용자');

    // DEMO 배너가 항상 보인다 (요구사항 2번).
    await expect(page.getByText(/DEMO 모드입니다/)).toBeVisible();
    // 관리 권한이 없는 이용자다.
    await expect(page.getByText('이용자', { exact: true }).first()).toBeVisible();
    // 지표가 아니라 눌러 볼 것이 먼저 보인다.
    await expect(page.getByRole('link', { name: /도구 둘러보기/ })).toBeVisible();
  });

  /* ------------------------------------------------------------- 2. 도구 등록 */
  await test.step('4단계 위저드로 도구를 등록한다', async () => {
    await navigateTo(page, '자동화 도구');
    await page.getByRole('link', { name: /내 도구 공유하기/ }).click();
    await page.waitForURL('**/tools/new');

    // 1단계: 기본 정보 — 부서·운영 책임자·공개 범위·도구 설명이 사라졌다.
    await page.getByLabel('도구 이름').fill(TOOL_NAME);
    await page.getByLabel('한 줄 소개').fill('회의 녹취를 요약해 결정사항과 할 일을 정리합니다.');
    await page.getByLabel('카테고리').selectOption({ label: '문서·회의' });
    await page.getByLabel('어디서 실행하나요').selectOption({ label: '웹에서 실행' });
    await page
      .getByLabel('해결하려는 업무 문제')
      .fill('회의록 정리에 회의당 40분이 걸려 다른 업무가 밀립니다.');
    await page.getByRole('button', { name: '다음' }).click();

    // 2단계: 기능과 업무 흐름
    await expect(page.getByRole('heading', { name: /기능과 업무 흐름/ })).toBeVisible();
    await page.getByPlaceholder('예: 규정 조항 검색 후 근거와 함께 답변').fill('녹취 자동 요약');
    await page.getByRole('button', { name: '추가' }).click();
    await page.getByLabel('현재 업무 흐름').fill('담당자가 녹취를 듣고 직접 정리합니다.');
    await page.getByLabel('자동화 후 업무 흐름').fill('도구가 초안을 만들고 담당자가 확인합니다.');
    await page.getByLabel('입력 자료').fill('회의 녹취 파일');
    await page.getByLabel('결과물').fill('요약본과 할 일 목록');
    await page.getByRole('button', { name: '다음' }).click();

    // 3단계: 다루는 데이터 — 연동 시스템 단계가 사라졌다.
    //         데이터 분류를 고르지 않으면 신청이 막힌다.
    await page.getByLabel('내부정보').check();
    await page.getByLabel('데이터 저장 위치').fill('교내 서버');
    await page.getByLabel('보관 기간').fill('처리 후 즉시 삭제');
    await page.getByRole('button', { name: '다음' }).click();

    // 4단계: 첨부와 확인 — 비용과 성과 단계는 통째로 없앴다.
    await expect(page.getByRole('heading', { name: /첨부와 확인/ })).toBeVisible();
    // 저장 전에는 첨부를 올릴 수 없다고 안내한다.
    await expect(page.getByText('먼저 임시저장을 해 주세요')).toBeVisible();

    await page.getByRole('button', { name: '임시저장' }).click();
    await expect(page.getByText('임시저장했습니다')).toBeVisible();

    // 저장 후에는 첨부 영역이 열린다.
    await expect(page.getByRole('button', { name: '파일 선택' })).toBeVisible();

    await page.getByRole('button', { name: '등록 신청' }).click();
    await page.waitForURL(/\/tools\/[0-9a-f-]+$/);

    await expect(page.getByRole('heading', { name: TOOL_NAME })).toBeVisible();
    await expect(page.getByText('등록 신청', { exact: true }).first()).toBeVisible();
  });

  const toolUrl = page.url();

  /* --------------------------------------------------------- 3. 검토자 보완요청 */
  await test.step('검토자가 배정받고 보완을 요청한다', async () => {
    await logout(page);
    await loginAs(page, '검토자');

    await navigateTo(page, '검토 작업');
    await mainContent(page).getByRole('link', { name: TOOL_NAME }).click();
    await page.waitForURL(/\/reviews\/[0-9a-f-]+$/);

    await page.getByRole('button', { name: '이 도구 검토 맡기' }).click();
    await expect(page.getByText('이 도구의 검토를 맡았습니다')).toBeVisible();

    // 체크리스트가 없으면 시범운영 승인 버튼이 아예 나오지 않는다 (요구사항 15번).
    await expect(page.getByRole('button', { name: '시범운영 승인' })).toHaveCount(0);

    await page.getByRole('button', { name: '보완 요청' }).click();
    await page
      .getByLabel('변경 이유')
      .fill('보관기간을 개월 단위로 구체적으로 적어 주세요.');
    await page
      .getByLabel('검토 의견')
      .fill('"처리 후 즉시 삭제"가 실제로 어떤 시점인지 명시가 필요합니다.');
    await page.getByRole('dialog').getByRole('button', { name: '보완 요청' }).click();

    await expect(page.getByText('보완 요청', { exact: true }).first()).toBeVisible();
  });

  /* ------------------------------------------------------ 4. 개발자 수정·재신청 */
  await test.step('만든 사람이 보완해 다시 신청한다', async () => {
    await logout(page);
    await loginAs(page, '이용자');

    await page.goto(toolUrl);
    await expect(page.getByText('보완 요청', { exact: true }).first()).toBeVisible();

    await page.getByRole('link', { name: '수정' }).click();
    await page.waitForURL(/\/tools\/[0-9a-f-]+\/edit$/);
    await expect(page.getByText('보완 요청을 받은 도구입니다')).toBeVisible();

    // 3단계로 이동해 보관기간을 고친다.
    await page.getByRole('button', { name: /^3 다루는 데이터/ }).click();
    await page.getByLabel('보관 기간').fill('처리 후 3개월 보관 뒤 자동 파기');

    await page.getByRole('button', { name: /^4 첨부와 확인/ }).click();
    await page.getByLabel('변경 사항').fill('보관기간을 3개월로 명시했습니다.');

    await page.getByRole('button', { name: '보완 후 재신청' }).click();
    await page.waitForURL(/\/tools\/[0-9a-f-]+$/);

    await expect(page.getByText('등록 신청', { exact: true }).first()).toBeVisible();
  });

  /* ------------------------------------------------- 5. 검토자 체크리스트·승인 */
  await test.step('검토자가 위험 체크리스트를 작성하고 시범운영을 승인한다', async () => {
    await logout(page);
    await loginAs(page, '검토자');

    await navigateTo(page, '검토 작업');
    await mainContent(page).getByRole('link', { name: TOOL_NAME }).click();

    // 재신청된 도구는 '등록 신청' 상태로 돌아와 있다. 검토를 다시 시작해야
    // 담당자 검토 단계로 넘어간다.
    await page.getByRole('button', { name: '검토 시작' }).click();
    await page.getByLabel('변경 이유').fill('보완 내용을 확인하기 위해 검토를 다시 시작합니다.');
    await page.getByRole('dialog').getByRole('button', { name: '검토 시작' }).click();
    await expect(page.getByText('담당자 검토', { exact: true }).first()).toBeVisible();

    // 체크리스트: 해당 항목 없이 낮음으로 확정한다.
    await page.getByRole('radio', { name: '낮음' }).click();
    await page
      .getByLabel('등급 판단 근거')
      .fill('내부정보만 다루고 결과를 사람이 최종 확인합니다.');
    await page.getByRole('button', { name: '체크리스트 저장' }).click();
    await expect(page.getByText('위험 체크리스트를 저장했습니다')).toBeVisible();

    // 체크리스트가 생기면 시범운영 승인 버튼이 나타난다.
    await page.getByRole('button', { name: '시범운영 승인' }).click();
    await page.getByLabel('변경 이유').fill('위험 요소가 낮아 시범운영을 승인합니다.');
    await page.getByRole('dialog').getByRole('button', { name: '시범운영 승인' }).click();

    await expect(page.getByText('시범운영', { exact: true }).first()).toBeVisible();
  });

  /* ------------------------------------------------------------ 6. 수요자 평가 */
  await test.step('다른 이용자가 평가를 등록한다', async () => {
    await logout(page);
    await loginAs(page, '다른이용자');

    await page.goto(toolUrl);
    await page.getByRole('button', { name: '평가하기' }).click();

    const dialog = page.getByRole('dialog');

    // 평가가 익명이라는 사실을 화면에서 알려 준다 (리뷰 7절).
    await expect(dialog.getByText(/익명으로 남습니다/)).toBeVisible();

    // 이제 종합 만족도 하나만 고르면 된다 (리뷰 7절).
    // 라디오는 sr-only 라 눈에 보이는 라벨이 클릭을 가로챈다.
    // 실제 사용자는 라벨을 누르므로, 여기서는 force 로 입력에 직접 전달한다.
    await dialog
      .getByRole('group', { name: '종합 만족도' })
      .getByRole('radio', { name: '4점 우수' })
      .check({ force: true });

    await dialog.getByLabel('의견').fill('초안 품질이 좋아 정리 시간이 크게 줄었습니다.');
    await dialog.getByRole('button', { name: '저장' }).click();

    // 평가 탭에서 결과를 확인한다.
    await page.getByRole('tab', { name: /평가/ }).click();
    await expect(page.getByText('1명이 남긴 종합 만족도입니다.')).toBeVisible();

    // 작성자 이름이 평가 목록에 나오지 않는다 (리뷰 7절: 익명).
    // 상단바에는 로그인한 사람 이름이 있으므로 본문으로 범위를 좁힌다.
    await expect(mainContent(page).getByText('박수요')).toHaveCount(0);
  });

  /* -------------------------------------------------------- 7. 수요자 개선요청 */
  await test.step('쓴 사람이 개선을 요청한다', async () => {
    await page.goto(toolUrl);
    await page.getByRole('button', { name: '개선 요청' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('제목').fill('요약본에 발언자 이름을 넣어 주세요');
    await dialog.getByLabel('요청 유형').selectOption({ label: '신규 기능' });
    await dialog
      .getByLabel('상세 내용')
      .fill('누가 무엇을 말했는지 구분되지 않아 확인에 시간이 걸립니다.');
    await dialog.getByRole('button', { name: '요청 등록' }).click();

    await page.waitForURL(/\/improvements\/[0-9a-f-]+$/);
    await expect(
      page.getByRole('heading', { name: '요약본에 발언자 이름을 넣어 주세요' }),
    ).toBeVisible();
    await expect(page.getByText('접수', { exact: true }).first()).toBeVisible();
  });

  /* ------------------------------------------------- 8. 관리자 대시보드·감사로그 */
  await test.step('관리자가 대시보드와 감사 로그를 확인한다', async () => {
    await logout(page);
    await loginAs(page, '관리자');

    await navigateTo(page, '관리');
    await page.waitForURL('**/admin');
    await expect(page.getByRole('heading', { name: '관리' })).toBeVisible();

    // 감사 로그에 지금까지의 작업이 남아 있다 (요구사항 18번).
    await page
      .getByRole('navigation', { name: '관리 메뉴' })
      .getByRole('link', { name: '감사 로그' })
      .click();
    await page.waitForURL('**/admin/audit-logs');

    // 필터 드롭다운의 <option> 이 아니라 표 본문에서 확인한다.
    const table = page.getByRole('table');
    for (const action of [
      'tool.draft.create',
      'tool.submit',
      'review.assign',
      'review.checklist',
      'tool.status.pilot',
      'evaluation.create',
      'improvement.create',
    ]) {
      await expect(table.getByText(action, { exact: true }).first()).toBeVisible();
    }

    // 로그에는 값이 아니라 바뀐 필드 이름만 들어 있다.
    await expect(page.getByText('감사 로그에는 값이 아니라')).toBeVisible();
  });
});

test('관리 권한이 없는 이용자는 관리 화면에 못 들어간다', async ({ page }) => {
  await loginAs(page, '다른이용자');

  // 관리 권한이 없으면 검토·관리 메뉴가 보이지 않는다.
  const nav = page.getByRole('navigation', { name: '주요 메뉴' }).first();
  await expect(nav.getByRole('link', { name: '검토 작업' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: '관리' })).toHaveCount(0);

  // 주소를 직접 입력해도 서버가 막는다. 화면 숨김은 보안 경계가 아니다.
  for (const path of ['/reviews', '/admin', '/admin/users']) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} 는 404 여야 한다`).toBe(404);
    await expect(page.getByText('페이지를 찾을 수 없습니다')).toBeVisible();
  }

  // 반대로, 도구 등록은 누구나 할 수 있다. 이것이 권한 재설계의 핵심이다.
  const response = await page.goto('/tools/new');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '자동화 도구 등록' })).toBeVisible();
});

test('검토 권한만 받은 관리자는 계정 관리에 못 들어간다', async ({ page }) => {
  await loginAs(page, '검토자');

  // 검토 메뉴는 보이고 관리 메뉴도 보인다 (권한을 하나 가졌으므로).
  const nav = page.getByRole('navigation', { name: '주요 메뉴' }).first();
  await expect(nav.getByRole('link', { name: '검토 작업' })).toBeVisible();
  await expect(nav.getByRole('link', { name: '관리' })).toBeVisible();

  // 다만 관리 안에서는 '현황' 탭만 있다. 받지 못한 권한의 탭은 보여주지 않는다.
  await page.goto('/admin');
  const adminNav = page.getByRole('navigation', { name: '관리 메뉴' });
  await expect(adminNav.getByRole('link', { name: '현황' })).toBeVisible();
  await expect(adminNav.getByRole('link', { name: '사용자' })).toHaveCount(0);
  await expect(adminNav.getByRole('link', { name: '감사 로그' })).toHaveCount(0);

  // 주소를 직접 입력해도 막힌다.
  for (const path of ['/admin/users', '/admin/audit-logs']) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} 는 404 여야 한다`).toBe(404);
  }
});
