import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'contact@ayfoodpalace.com';
/** Set PLAYWRIGHT_ADMIN_PASSWORD in the environment — never commit the real password. */
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '';

test.describe('Ay Food admin', () => {
  test('login page matches secure admin layout', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText(/Admin Dashboard Access/i)).toBeVisible();
    await expect(page.getByText(/Secure Admin Access/i)).toBeVisible();
    await expect(page.getByLabel(/Department/i)).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/^Password$/i)).toBeVisible();
  });

  test('demo login reaches dashboard', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'Set PLAYWRIGHT_ADMIN_PASSWORD to run login tests');
    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^Password$/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();

    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole('button', { name: /Light Mode|Dark Mode/i })).toBeVisible();
    await expect(page.getByText(/Dashboard|Orders|Menu/i).first()).toBeVisible();
  });

  test('admin can open orders and menu pages', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'Set PLAYWRIGHT_ADMIN_PASSWORD to run login tests');
    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^Password$/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();

    await page.goto('/admin/menu');
    await expect(page.getByRole('heading', { name: /Menu/i })).toBeVisible();
  });

  test('guest cannot open admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('wrong password stays on login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^Password$/i).fill('wrong-password-not-real');
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('theme toggle works when logged in', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'Set PLAYWRIGHT_ADMIN_PASSWORD to run login tests');
    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^Password$/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const toggle = page.getByRole('button', { name: /Light Mode|Dark Mode/i });
    await expect(toggle).toBeVisible();
    const before = await toggle.textContent();
    await toggle.click();
    const after = await toggle.textContent();
    expect(after).not.toEqual(before);
  });

  test('visitors and analytics pages load', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'Set PLAYWRIGHT_ADMIN_PASSWORD to run login tests');
    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^Password$/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    await page.goto('/admin/visitors');
    await expect(page.getByRole('heading', { name: /Site Visits/i })).toBeVisible();

    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { name: /Analytics/i })).toBeVisible();
  });
});
