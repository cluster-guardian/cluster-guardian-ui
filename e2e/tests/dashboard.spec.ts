import { expect, test } from '@playwright/test';

/**
 * Drives the built SPA against a real `cluster-guardian serve --fixture`.
 * Assertions are about behaviour the user depends on — what renders, what the
 * filters do — not about markup details that churn.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'demo' })).toBeVisible();
});

test('renders the report header and summary from the API', async ({ page }) => {
  // run2.json is the current report: 22 findings, score 34, grade F.
  await expect(page.getByRole('img', { name: /score 34 out of 100, grade F/i })).toBeVisible();
  // The fixture carries no kubernetesVersion or context, so the header shows
  // only the analysis time — the optional parts must not leave stray separators.
  const meta = page.locator('.cluster-page__head p').first();
  await expect(meta).toHaveText(/^analyzed /);
});

test('lists namespace and cluster-wide sections', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'payments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
});

test('severity chips narrow the findings', async ({ page }) => {
  const count = page.getByText(/Showing \d+ of \d+ findings/);
  await expect(count).toBeVisible();
  const before = await count.textContent();

  // The glyph is aria-hidden, so the accessible name is "Info <count>".
  const infoChip = page.getByRole('button', { name: /^Info/ });
  await expect(infoChip).toHaveAttribute('aria-pressed', 'true');
  await infoChip.click();
  await expect(infoChip).toHaveAttribute('aria-pressed', 'false');
  await expect(count).not.toHaveText(before!);
});

test('search filters down to a single finding and back', async ({ page }) => {
  const search = page.getByPlaceholder('Search findings…');
  await search.fill('zzz-no-such-finding');
  await expect(page.getByText('No findings match these filters')).toBeVisible();

  await search.fill('');
  await expect(page.getByText('No findings match these filters')).toHaveCount(0);
});

test('namespace filter hides cluster-wide sections', async ({ page }) => {
  await page.getByLabel('Filter by namespace').selectOption('payments');
  await expect(page.getByRole('heading', { name: 'payments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Security' })).toHaveCount(0);
  await expect(page.getByText(/cluster-wide sections are hidden/)).toBeVisible();
});

test('team filter narrows to that team only', async ({ page }) => {
  await page.getByLabel('Filter by team').selectOption('payments-team');
  await expect(page.getByRole('heading', { name: 'payments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'shop' })).toHaveCount(0);
});

test('the trend renders and has a table equivalent', async ({ page }) => {
  // Two fixtures were appended, so history has two runs.
  await expect(page.getByText(/Findings by severity over 2 runs/)).toBeVisible();

  await page.getByRole('button', { name: 'Show table' }).click();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Critical' })).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(3); // header + two runs
});

test('the diff panel reports what changed between the two runs', async ({ page }) => {
  // 19 new + 12 resolved is past the collapse threshold, so it starts closed
  // and the counts have to be readable from the summary alone.
  const summary = page.locator('summary', { hasText: 'Since the previous run' });
  await expect(summary).toContainText('19 new');
  await expect(summary).toContainText('12 resolved');

  await summary.click();
  const panel = page.locator('.diff');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: /New/ })).toBeVisible();
  await expect(panel.getByRole('heading', { name: /Resolved/ })).toBeVisible();
});

test('download links point at the API, not the SPA', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'JSON' })).toHaveAttribute('href', '/api/report');
  await expect(page.getByRole('link', { name: 'Markdown' })).toHaveAttribute(
    'href',
    '/api/report/markdown',
  );
});

test('single-cluster mode does not offer fleet navigation', async ({ page }) => {
  // The backend runs without --fleet, so the SPA must not show "All clusters".
  await expect(page.getByRole('link', { name: /All clusters/ })).toHaveCount(0);
  await expect(page.getByText('single cluster')).toBeVisible();
});

test('an unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByText('Page not found')).toBeVisible();
});

test('the theme toggle stamps data-theme on the document', async ({ page }) => {
  await page.getByLabel('Color theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByLabel('Color theme').selectOption('system');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
});
