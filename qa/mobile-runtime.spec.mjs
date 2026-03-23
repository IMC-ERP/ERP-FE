import fs from 'node:fs';
import { test, expect, devices } from 'playwright/test';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const REPORT_PATH = '/tmp/mobile-runtime-qa-report.json';

test.use({
  ...devices['iPhone 13'],
  browserName: 'chromium',
  baseURL: BASE_URL,
  trace: 'off',
  screenshot: 'off',
  video: 'off',
});

test.describe.configure({ mode: 'serial' });

const report = {
  previewNavigation: [],
  previewClicks: [],
  loginFlow: [],
  blocked: [],
};

const routeMap = [
  ['홈', '/'],
  ['경영 현황', '/dashboard'],
  ['매출 입력', '/sales'],
  ['매출 분석', '/period'],
  ['거래 데이터 관리', '/transactions'],
  ['재고 관리', '/inventory'],
  ['원가/레시피 관리', '/cost-recipe'],
  ['메뉴 레시피', '/recipes'],
  ['KPI 현황', '/kpi'],
  ['AI 코파일럿', '/ai'],
  ['도움말', '/help'],
  ['설정', '/settings'],
];

const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();

const describeLocator = async (locator) => locator.evaluate((element) => {
  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
  const aria = element.getAttribute('aria-label') || '';
  const title = element.getAttribute('title') || '';
  const href = element.getAttribute('href') || '';
  const disabled = Boolean(
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );

  const segments = [];
  let current = element;
  while (current && segments.length < 6) {
    const parent = current.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current) : 0;
    segments.unshift(`${current.tagName.toLowerCase()}:${index}`);
    current = parent;
  }

  const identityBase = [
    element.tagName.toLowerCase(),
    text,
    aria,
    title,
    href,
  ].filter(Boolean).join('|');

  return {
    key: identityBase || `${element.tagName.toLowerCase()}|${segments.join('>')}`,
    text,
    aria,
    title,
    href,
    disabled,
    named: Boolean(text || aria || title || href),
    path: segments.join('>'),
    tag: element.tagName.toLowerCase(),
  };
});

const restoreRouteIfNeeded = async (page, routePath) => {
  const currentUrl = page.url();

  if (!currentUrl.startsWith(BASE_URL)) {
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(180);
    return;
  }

  const currentPath = new URL(currentUrl).pathname;
  if (currentPath !== routePath) {
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(180);
  }
};

const clickAndRecord = async (page, locator, routePath, bucket) => {
  const descriptor = await describeLocator(locator);
  const entry = {
    route: routePath,
    label: descriptor.text || descriptor.aria || descriptor.title || descriptor.href || descriptor.tag,
    key: descriptor.key,
    disabled: descriptor.disabled,
    outcome: 'pending',
  };

  if (descriptor.disabled) {
    entry.outcome = 'disabled';
    bucket.push(entry);
    return entry;
  }

  let dialogSeen = false;
  const dialogHandler = async (dialog) => {
    dialogSeen = true;
    await dialog.dismiss();
  };

  page.once('dialog', dialogHandler);

  let fileChooserSeen = false;
  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 500 })
    .then(async (chooser) => {
      fileChooserSeen = true;
      await chooser.setFiles([]);
    })
    .catch(() => undefined);

  let popupSeen = false;
  const popupPromise = page.waitForEvent('popup', { timeout: 500 })
    .then(async (popup) => {
      popupSeen = true;
      await popup.close().catch(() => undefined);
    })
    .catch(() => undefined);

  try {
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ force: true, timeout: 2500 });
    await Promise.allSettled([fileChooserPromise, popupPromise]);
    await page.waitForTimeout(180);
    entry.outcome = 'clicked';
  } catch (error) {
    entry.outcome = 'error';
    entry.error = error instanceof Error ? error.message : String(error);
  } finally {
    page.removeListener('dialog', dialogHandler);
  }

  if (dialogSeen) entry.dialog = true;
  if (fileChooserSeen) entry.fileChooser = true;
  if (popupSeen) entry.popup = true;
  entry.urlAfter = page.url();

  await restoreRouteIfNeeded(page, routePath);
  bucket.push(entry);
  return entry;
};

const auditScope = async (page, routePath, scopeSelector, bucket, maxSteps = 20) => {
  const seen = new Set();

  for (let step = 0; step < maxSteps; step += 1) {
    const locator = page.locator(`${scopeSelector} button:visible, ${scopeSelector} [role="tab"]:visible, ${scopeSelector} a[href]:visible`);
    const count = await locator.count();
    let progressed = false;

    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (!(await candidate.isVisible().catch(() => false))) {
        continue;
      }

      const descriptor = await describeLocator(candidate);
      if (seen.has(descriptor.key)) {
        continue;
      }

      seen.add(descriptor.key);

      if (!descriptor.named) {
        bucket.push({
          route: routePath,
          label: '(unlabeled button)',
          key: descriptor.key,
          path: descriptor.path,
          outcome: 'skipped-unlabeled',
        });
        report.blocked.push(`라벨 없는 버튼: ${routePath} / ${descriptor.path}`);
        progressed = true;
        break;
      }

      await clickAndRecord(page, candidate, routePath, bucket);
      progressed = true;
      break;
    }

    if (!progressed) {
      break;
    }
  }

  return seen.size;
};

const openSidebar = async (page) => {
  const menuButton = page.getByRole('button', { name: '메뉴 열기' });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
    await page.waitForTimeout(250);
  }
};

const closeDrawerIfOpen = async (page) => {
  const closeButton = page.getByRole('button', { name: /닫기|메뉴 닫기/ }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click().catch(() => undefined);
    await page.waitForTimeout(250).catch(() => undefined);
  }
};

test.afterAll(async () => {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
});

test('preview mode mobile runtime QA', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Coffee ERP' })).toBeVisible();

  await page.getByRole('button', { name: '로그인 없이 둘러보기' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const utilityButtons = [
    { name: /글자 크기 변경/, route: '/dashboard' },
    { name: /다크 모드로 전환|라이트 모드로 전환/, route: '/dashboard' },
    { name: 'AI 코파일럿', route: '/dashboard' },
  ];

  for (const button of utilityButtons) {
    const locator = page.getByRole('button', { name: button.name }).first();
    if (await locator.isVisible().catch(() => false)) {
      await clickAndRecord(page, locator, button.route, report.previewClicks);
      await closeDrawerIfOpen(page);
    }
  }

  for (const [label, route] of routeMap) {
    await openSidebar(page);
    const navItem = page.getByRole('link', { name: label }).first();
    await expect(navItem).toBeVisible();
    await navItem.click();
    await page.waitForTimeout(400);
    report.previewNavigation.push({
      label,
      route,
      url: page.url(),
    });

    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await auditScope(page, route, 'main', report.previewClicks);
  }
});

test('login flow mobile QA', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '기존 계정으로 로그인' })).toBeVisible();
  report.loginFlow.push({ step: 'login-select-visible', url: page.url() });

  await page.getByRole('button', { name: '기존 계정으로 로그인' }).click();
  await expect(page.getByRole('button', { name: 'Google로 로그인' })).toBeVisible();
  report.loginFlow.push({ step: 'login-mode-visible', url: page.url() });

  await page.getByRole('button', { name: '← 뒤로 가기' }).click();
  await expect(page.getByRole('button', { name: '새 매장 등록 (회원가입)' })).toBeVisible();

  await page.getByRole('button', { name: '새 매장 등록 (회원가입)' }).click();
  await expect(page.getByRole('button', { name: 'Google로 회원가입' })).toBeVisible();
  report.loginFlow.push({ step: 'signup-mode-visible', url: page.url() });

  const googleButton = page.getByRole('button', { name: 'Google로 회원가입' });
  await googleButton.click();

  let oauthOutcome = 'same-origin';
  try {
    await page.waitForURL((url) => !url.href.startsWith(BASE_URL), { timeout: 8000 });
    oauthOutcome = `redirect:${page.url()}`;
  } catch {
    const errorBox = page.locator('text=인증에 실패했습니다. 다시 시도해주세요., text=인증이 차단되었습니다, text=팝업').first();
    if (await errorBox.isVisible().catch(() => false)) {
      oauthOutcome = `error:${normalizeText(await errorBox.textContent())}`;
    }
  }

  report.loginFlow.push({ step: 'google-auth-handoff', outcome: oauthOutcome, url: page.url() });
  report.blocked.push('실제 Google 로그인 완료 후 인증된 상태는 테스트 계정/세션이 없어 자동화하지 못했습니다.');
});
