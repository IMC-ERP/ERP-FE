import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const RUN_MODE = process.argv[2] === 'desktop' ? 'desktop' : 'mobile';
const REPORT_PATH = RUN_MODE === 'desktop'
  ? '/tmp/desktop-runtime-qa-report.json'
  : '/tmp/mobile-runtime-qa-report.json';

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

const report = {
  previewNavigation: [],
  previewClicks: [],
  loginFlow: [],
  loginClicks: [],
  blocked: [],
};

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
  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 400 })
    .then(async (chooser) => {
      fileChooserSeen = true;
      await chooser.setFiles([]);
    })
    .catch(() => undefined);

  let popupSeen = false;
  const popupPromise = page.waitForEvent('popup', { timeout: 400 })
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

const auditScope = async (page, routePath, scopeSelector, bucket, maxSteps = 120) => {
  const seen = new Set();

  const initialLocator = page.locator(`${scopeSelector} button:visible, ${scopeSelector} [role="tab"]:visible, ${scopeSelector} a[href]:visible`);
  const initialCount = await initialLocator.count();
  if (initialCount === 0) {
    await page.waitForTimeout(700);
  }

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
};

const recordLoginClick = async (page, locator, step) => {
  const result = await clickAndRecord(page, locator, '/login', report.loginClicks);
  report.loginFlow.push({
    step,
    outcome: result.outcome,
    label: result.label,
    url: page.url(),
  });
  return result;
};

const openSidebar = async (page) => {
  await closeDrawerIfOpen(page);
  const menuButton = page.getByRole('button', { name: '메뉴 열기' });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click({ force: true });
    await page.waitForTimeout(180);
  }
};

const closeDrawerIfOpen = async (page) => {
  const drawer = page.locator('div.fixed.inset-y-0.right-0.translate-x-0').last();
  if (await drawer.isVisible().catch(() => false)) {
    const closeButton = drawer.locator('button').nth(1);
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(180);
      return;
    }
  }

  const fallbackCloseButton = page.getByRole('button', { name: /닫기|메뉴 닫기/ }).last();
  if (await fallbackCloseButton.isVisible().catch(() => false)) {
    await fallbackCloseButton.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(180);
  }
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(
    RUN_MODE === 'desktop'
      ? {
        viewport: { width: 1440, height: 1100 },
        baseURL: BASE_URL,
      }
      : {
        ...devices['iPhone 13'],
        baseURL: BASE_URL,
      }
  );
  const page = await context.newPage();

  try {
    console.log('[QA] preview login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '로그인 없이 둘러보기' }).click();
    await page.waitForURL(/\/dashboard$/);

    const utilityButtons = [
      /글자 크기 변경/,
      /다크 모드로 전환|라이트 모드로 전환/,
      /^AI 코파일럿$/,
    ];

    for (const name of utilityButtons) {
      const locator = page.getByRole('button', { name }).first();
      if (await locator.isVisible().catch(() => false)) {
        const result = await clickAndRecord(page, locator, '/dashboard', report.previewClicks);
        console.log('[QA] utility', result.label, result.outcome);
        await closeDrawerIfOpen(page);
      }
    }

    for (const [label, route] of routeMap) {
      console.log(`[QA] route ${route}`);
      await openSidebar(page);
      const navItem = page.getByRole('link', { name: label }).first();
      if (await navItem.isVisible().catch(() => false)) {
        await navItem.scrollIntoViewIfNeeded().catch(() => undefined);
        await navItem.evaluate((element) => element.click());
        await page.waitForTimeout(220);
      }

      report.previewNavigation.push({ label, route, url: page.url() });
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await auditScope(page, route, 'main', report.previewClicks);
    }

    console.log('[QA] login flow');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    report.loginFlow.push({ step: 'login-select-visible', url: page.url() });

    await recordLoginClick(page, page.getByRole('button', { name: '기존 계정으로 로그인' }), 'login-select-open-login');
    report.loginFlow.push({ step: 'login-mode-visible', url: page.url() });

    await recordLoginClick(page, page.getByRole('button', { name: 'Google로 로그인' }), 'login-google-button');
    await recordLoginClick(page, page.getByRole('button', { name: '← 뒤로 가기' }), 'login-back-to-select');

    await recordLoginClick(page, page.getByRole('button', { name: '새 매장 등록 (회원가입)' }), 'login-select-open-signup');
    report.loginFlow.push({ step: 'signup-mode-visible', url: page.url() });

    const googleButton = page.getByRole('button', { name: 'Google로 회원가입' });
    await clickAndRecord(page, googleButton, '/login', report.loginClicks);

    let oauthOutcome = 'same-origin';
    try {
      await page.waitForURL((url) => !url.href.startsWith(BASE_URL), { timeout: 8000 });
      oauthOutcome = `redirect:${page.url()}`;
    } catch {
      const errorBox = page.locator('text=인증에 실패했습니다. 다시 시도해주세요., text=인증이 차단되었습니다, text=팝업').first();
      if (await errorBox.isVisible().catch(() => false)) {
        const text = (await errorBox.textContent()) || '';
        oauthOutcome = `error:${text.replace(/\s+/g, ' ').trim()}`;
      }
    }

    report.loginFlow.push({ step: 'google-auth-handoff', outcome: oauthOutcome, url: page.url() });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const previewEntryButton = page.getByRole('button', { name: '로그인 없이 둘러보기' });
    if (await previewEntryButton.isVisible().catch(() => false)) {
      await recordLoginClick(page, previewEntryButton, 'login-preview-entry');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    }

    report.blocked.push('실제 Google 로그인 완료 후 인증된 상태는 테스트 계정/세션이 없어 자동화하지 못했습니다.');
  } finally {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    await context.close();
    await browser.close();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
