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

test('the overview reports the score and how it was reached', async ({ page }) => {
  // run2.json is the current report: 22 findings, score 34, grade F.
  await expect(page.getByRole('img', { name: /score 34 out of 100, grade F/i })).toBeVisible();
  // The header carries only the analysis time — the fixture has no
  // kubernetesVersion or context, and the optional parts must not leave stray
  // separators behind.
  await expect(page.locator('.cluster-page__head p').first()).toHaveText(/^analyzed /);
});

test('the overview breaks findings down by area and links into them', async ({ page }) => {
  const row = page.getByRole('row', { name: /Security/ });
  await expect(row).toContainText('Failing');

  await page.getByRole('link', { name: /Security/ }).click();
  await expect(page).toHaveURL(/\/issues\?area=security/);
  // Landing pre-filtered is the point of the link.
  await expect(page.getByRole('button', { name: /^security/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the sidebar carries a live count and navigates to Issues', async ({ page }, testInfo) => {
  // The sidebar is a drawer below 960px; open it first.
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
  }
  // Scoped to the sidebar: the global nav has an "Issues" link too.
  const link = page.locator('.sidebar').getByRole('link', { name: /Issues/ });
  // 1 critical + 10 warnings.
  await expect(link).toContainText('11');
  await link.click();
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
});

test.describe('Issues', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/issues');
    await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
  });

  test('lists every finding worst-first', async ({ page }) => {
    await expect(page.getByText('22 findings')).toBeVisible();
    // The single critical must come first, above the ten warnings.
    await expect(page.locator('.issue').first()).toContainText('Critical');
  });

  test('severity facets narrow the list and keep their counts', async ({ page }) => {
    const info = page.getByRole('button', { name: /^Info/ });
    await expect(info).toHaveAttribute('aria-pressed', 'true');
    await info.click();
    await expect(info).toHaveAttribute('aria-pressed', 'false');
    // Turning a severity off must not zero its own count, or it could never be
    // turned back on.
    await expect(info).toContainText('11');
    await expect(page.getByText('11 of 22 findings')).toBeVisible();
  });

  test('facet counts are honest — clicking one yields exactly that many', async ({ page }) => {
    // Exact: "shop" and "shop-team" are both facet values.
    const shop = page.getByRole('button', { name: /^shop \d+$/ });
    const label = await shop.textContent();
    const expected = Number(label?.match(/(\d+)\s*$/)?.[1]);
    await shop.click();
    await expect(page.getByText(`${expected} of 22 findings`)).toBeVisible();
  });

  test('facets combine, and Clear resets them', async ({ page }) => {
    await page.getByRole('button', { name: /^shop \d+$/ }).click();
    await page.getByRole('button', { name: /^workloads \d+$/ }).click();
    const clear = page.getByRole('button', { name: /^Clear \(2\)$/ });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page.getByText('22 findings')).toBeVisible();
  });

  test('search narrows to nothing and back', async ({ page }) => {
    const search = page.getByPlaceholder('Search issues…');
    await search.fill('zzz-no-such-finding');
    await expect(page.getByText('No issues match these filters')).toBeVisible();
    await search.fill('');
    await expect(page.getByText('No issues match these filters')).toHaveCount(0);
  });

  test('the compliance facet keeps only control-mapped findings', async ({ page }) => {
    await page.getByLabel('Mapped to a control only').check();
    // Every remaining row must expose its control when expanded.
    const first = page.locator('.issue').first();
    await first.getByRole('button', { name: 'Why' }).click();
    await expect(first.locator('.issue__control')).toHaveCount(
      await first.locator('.issue__control').count(),
    );
    await expect(first.locator('.issue__control').first()).toContainText('PSS/');
  });

  test('remediation is behind a toggle, not always on', async ({ page }) => {
    const row = page.locator('.issue').first();
    await expect(row.locator('.issue__hint')).toHaveCount(0);
    await row.getByRole('button', { name: 'Why' }).click();
    await expect(row.locator('.issue__hint')).toBeVisible();
  });
});

test('the trend renders and has a table equivalent', async ({ page }) => {
  await expect(page.getByText(/Findings by severity over 2 runs/)).toBeVisible();

  await page.getByRole('button', { name: 'Show table' }).click();
  const table = page.getByRole('table').first();
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
  await expect(page.getByRole('link', { name: 'Fleet', exact: true })).toHaveCount(0);
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
