import { expect, test, type Page } from '@playwright/test';

/**
 * RBAC rendering, driven against a real backend in --auth-mode=proxy.
 *
 * The e2e server trusts any peer and maps platform=admin, sre=operator, so
 * setting request headers is enough to become any role — no identity provider,
 * no cluster. That is the whole reason fixture mode applies auth.
 *
 * Fixture mode has no cluster to write to, so --admin-api is unavailable and
 * every write feature reports as unsupported. That is itself worth asserting:
 * the UI must distinguish "you may not" from "this server cannot".
 */

function asUser(page: Page, groups: string) {
  return page.setExtraHTTPHeaders({
    'X-Forwarded-User': 'tester',
    'X-Forwarded-Groups': groups,
  });
}

test('an anonymous caller still reads, and is told they are anonymous', async ({ page }) => {
  await page.goto('/settings/access');
  // Both the header and the page body say it; assert on the page body.
  await expect(page.locator('.access__item').first()).toContainText('Anonymous');
  await expect(page.getByText(/This request carries no identity/)).toBeVisible();
  // Anonymous defaults to viewer, so reading still works.
  await expect(page.getByRole('row', { name: /reports:read/ })).toContainText('Allowed');
});

test('the header shows who you are and at what role', async ({ page }) => {
  await asUser(page, 'platform');
  await page.goto('/settings/access');
  await expect(page.locator('.usermenu__name')).toHaveText('tester');
  await expect(page.locator('.usermenu__role')).toHaveText('admin');
});

test('groups map to roles, highest wins', async ({ page }) => {
  await asUser(page, 'sre');
  await page.goto('/settings/access');
  await expect(page.locator('.usermenu__role')).toHaveText('operator');

  // sre grants operator and platform grants admin; together, admin.
  await asUser(page, 'sre,platform');
  await page.goto('/settings/access');
  await expect(page.locator('.usermenu__role')).toHaveText('admin');
});

test('an unmapped group falls back to the default role', async ({ page }) => {
  await asUser(page, 'contractors');
  await page.goto('/settings/access');
  await expect(page.locator('.usermenu__role')).toHaveText('viewer');
});

test('the access page reports every permission and its outcome', async ({ page }) => {
  await asUser(page, 'platform');
  await page.goto('/settings/access');

  await expect(page.getByRole('row', { name: /reports:read/ })).toContainText('Allowed');
  // Admin holds these, but this deployment does not serve them — the UI must
  // say that rather than claiming the permission is denied.
  await expect(page.getByRole('row', { name: /clusters:write/ })).toContainText(
    'Not enabled on this server',
  );
  await expect(page.getByRole('row', { name: /teams:write/ })).toContainText(
    'Not enabled on this server',
  );
});

test('settings sections the server cannot serve are not offered', async ({ page }) => {
  await asUser(page, 'platform');
  await page.goto('/settings/preferences');

  // Preferences and Access always exist; Clusters and Teams need --admin-api.
  await expect(page.getByRole('link', { name: 'Preferences' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Access' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Clusters' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Teams' })).toHaveCount(0);
});

test('Settings is reachable regardless of role', async ({ page }, testInfo) => {
  // Preferences and Access need no permission at all, so the entry point must
  // not be hidden behind one — on either viewport. Below 960px the global bar
  // collapses and the destinations move into the drawer.
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
  }
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings\/preferences/);
});

test.describe('preferences', () => {
  test('persist across a reload', async ({ page }) => {
    await page.goto('/settings/preferences');
    await page.getByLabel('Density').selectOption('compact');
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  });

  test('default severities change what Issues starts with', async ({ page }) => {
    await page.goto('/settings/preferences');
    // Drop Info from the defaults.
    await page.getByRole('button', { name: 'Info' }).click();

    await page.goto('/issues');
    await expect(page.getByRole('button', { name: /^Info/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByText('11 of 22 findings')).toBeVisible();
  });

  test('reset restores the defaults', async ({ page }) => {
    await page.goto('/settings/preferences');
    await page.getByLabel('Density').selectOption('compact');
    await page.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable');
  });
});
