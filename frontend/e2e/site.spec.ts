import { test, expect, type Page } from '@playwright/test';

async function addAmalaToCart(page: Page) {
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Amala', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Amala', exact: true }) });
  await card.getByRole('button', { name: /Add to Cart/i }).click();
}

async function fillCheckout(page: Page, name = 'E2E Customer') {
  await page.getByLabel(/Full Name/i).fill(name);
  await page.getByLabel(/^Phone$/i).fill('08173097933');
  await page.getByLabel(/Email/i).fill('e2e@ayfoodpalace.com');
  // Prefer labelled field; fall back for older deploys without htmlFor
  const address = page.getByLabel(/Delivery Address/i);
  if (await address.count()) {
    await address.fill('Ogijo, Ikorodu');
  } else {
    await page.locator('textarea').first().fill('Ogijo, Ikorodu');
  }
}

test.describe('Ay Food storefront', () => {
  test.beforeEach(async ({ page }) => {
    // FormSubmit opens a popup — ignore it in e2e
    await page.addInitScript(() => {
      window.open = () => null;
    });
    // Live chat iframe intercepts bottom-screen taps on mobile
    await page.route('**/embed.tawk.to/**', (route) => route.abort());
    await page.route('**/tawk.to/**', (route) => route.abort());
  });

  test('home loads and shows flyer menu categories', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Ay/i }).first()).toBeVisible();
    await expect(page.getByText(/Build Your Pack|Browse Menu|Popular/i).first()).toBeVisible();
  });

  test('mobile nav drawer opens with opaque panel and links', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mobile-nav-open').click();

    const drawer = page.getByTestId('mobile-nav-drawer');
    const panel = page.getByTestId('mobile-nav-panel');
    await expect(drawer).toBeVisible();
    await expect(panel).toBeVisible();

    await expect(panel.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Menu' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Build Pack' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Track Order' })).toBeVisible();

    const bg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');

    await page.getByTestId('mobile-nav-menu').click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(drawer).toHaveCount(0);
  });

  test('menu page lists flyer dishes', async ({ page }) => {
    await page.goto('/menu');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Swallow' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Meals' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Protein' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Amala', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jollof Rice', exact: true })).toBeVisible();
  });

  test('add item to pack from menu', async ({ page }) => {
    await addAmalaToCart(page);
    await page.waitForFunction(() => {
      try {
        const raw = localStorage.getItem('ay-food-cart-v2');
        if (!raw) return false;
        const cart = JSON.parse(raw) as { packs?: Array<{ items?: Array<{ foodName?: string }> }> };
        return (cart.packs ?? []).some((p) =>
          (p.items ?? []).some((i) => /amala/i.test(i.foodName ?? '')),
        );
      } catch {
        return false;
      }
    }, undefined, { timeout: 10_000 });
    await expect(page.getByRole('link', { name: /View cart/i })).toBeVisible({ timeout: 8_000 });
  });

  test('checkout shows Kora pay flow and Attention confirm modal', async ({ page }) => {
    await addAmalaToCart(page);
    await page.waitForFunction(() => {
      try {
        const raw = localStorage.getItem('ay-food-cart-v2');
        if (!raw) return false;
        const cart = JSON.parse(raw) as { packs?: Array<{ items?: unknown[] }> };
        return (cart.packs ?? []).some((p) => (p.items?.length ?? 0) > 0);
      } catch {
        return false;
      }
    });

    await page.goto('/checkout');
    await fillCheckout(page);
    await expect(page.getByText(/Payment: Kora/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Pay with Kora/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /Pay with Kora/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Attention!!!' })).toBeVisible();
    await expect(page.getByText(/You will pay now/i)).toBeVisible();
    await expect(page.getByText(/Processing fee/i)).toBeVisible();

    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page.getByRole('heading', { name: 'Attention!!!' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Checkout/i })).toBeVisible();
    await expect(page.getByText(/Amala/i).first()).toBeVisible();
  });

  test('full Kora payment is out of scope for automated e2e', async () => {
    test.skip(
      true,
      'Completing Kora checkout needs a real/test card session — covered manually in sandbox.',
    );
  });

  test('admin status update after paid order is out of scope without Kora pay', async () => {
    test.skip(
      true,
      'Requires a paid order via Kora; track + admin status covered manually after payment.',
    );
  });

  test('track page accepts order lookup UI', async ({ page }) => {
    await page.goto('/track');
    await expect(page.getByRole('heading', { name: /Track Your/i })).toBeVisible();
    await page.getByPlaceholder(/AY/i).fill('AY-DOES-NOT-EXIST');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByText(/Order not found/i)).toBeVisible();
  });
});
