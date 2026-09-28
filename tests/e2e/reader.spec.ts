import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function highlightPoint(page: Page, quote: string) {
  return page.evaluate(async (quote) => {
    const range = [...CSS.highlights.get('saved')!].find(
      (item) => item.toString() === quote,
    ) as Range;
    range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = range.getClientRects()[0];
    return { x: rect.left + Math.min(rect.width / 2, 20), y: rect.top + rect.height / 2 };
  }, quote);
}

test('quiet reader: selection, hover memo, reload and touch', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '残したもの', exact: true })).toBeVisible();
  await page.getByLabel('残したいURL').fill('https://zenn.dev/ashunar0/articles/cc351badf8681c');
  await page.getByRole('button', { name: '残す', exact: true }).click();
  await expect(page.locator('.reader-prose')).toBeVisible({ timeout: 45_000 });
  const articleUrl = page.url();
  await expect(page.locator('aside')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const selectedQuote = await page.locator('.reader-prose').evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && (node.textContent?.length ?? 0) < 15) node = walker.nextNode();
    if (!node) throw new Error('No article text');
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 15);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return range.toString();
  });
  await page.getByRole('button', { name: 'メモを追加', exact: true }).click();
  const note = `E2E hover memo ${Date.now()}`;
  await page.getByLabel('メモ', { exact: true }).fill(note);
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(note, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'メモを閉じる' }).click();
  await page.reload();
  await expect(page.locator('.reader-prose')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const point = await highlightPoint(page, selectedQuote);
  await page.mouse.move(point.x, point.y);
  await expect(page.getByRole('dialog').getByText(note, { exact: true })).toBeVisible();
  // Moving across the gap must keep the card usable.
  await page.getByRole('dialog').hover();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'test-results/reader-hover.png' });
  await page.mouse.move(5, 5);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Keyboard users can open the same highlight and Escape dismisses it.
  await page
    .getByRole('button', { name: /^ハイライトのメモ:/ })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Whole-article notes remain behind the single header action.
  await page.getByRole('button', { name: 'メモ', exact: true }).click();
  await page.getByRole('button', { name: '＋ メモを追加' }).click();
  const articleNote = `E2E article memo ${Date.now()}`;
  await page.getByLabel('メモ', { exact: true }).fill(articleNote);
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(articleNote, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'メモを閉じる' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/reader-desktop.png' });
  await page.getByRole('link', { name: '← 一覧' }).click();
  await expect(page.locator('.article-row')).not.toHaveCount(0);
  await page.screenshot({ path: 'test-results/library-desktop.png' });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileContext.newPage();
  try {
    await mobile.goto(articleUrl);
    await expect(mobile.locator('.reader-prose')).toBeVisible();
    await expect(mobile.getByRole('dialog')).toHaveCount(0);
    const touchPoint = await highlightPoint(mobile, selectedQuote);
    await mobile.touchscreen.tap(touchPoint.x, touchPoint.y);
    await expect(mobile.getByRole('dialog').getByText(note, { exact: true })).toBeVisible();
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await mobile.screenshot({ path: 'test-results/reader-mobile-tap.png' });
    await mobile.touchscreen.tap(10, 10);
    await expect(mobile.getByRole('dialog')).toHaveCount(0);
    await mobile.evaluate(() => window.scrollTo(0, 0));
    await mobile.screenshot({ path: 'test-results/reader-mobile.png' });
  } finally {
    await mobileContext.close();
  }
  expect(runtimeErrors).toEqual([]);
});

test('rejects internal URLs and preserves the input', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('残したいURL').fill('http://127.0.0.1');
  await page.getByRole('button', { name: '残す', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('内部');
  await expect(page.getByLabel('記事のURL')).toHaveValue('http://127.0.0.1');
});
