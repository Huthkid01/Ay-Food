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
  await page.getByLabel(/Delivery Address/i).fill('Ogijo, Ikorodu');
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

  test('payment modal opens without placing order; cancel keeps cart', async ({ page }) => {
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
    await page.getByRole('button', { name: /Continue to payment/i }).click();

    await expect(page.getByRole('heading', { name: 'Make payment' })).toBeVisible();
    await expect(page.getByText('OPay')).toBeVisible();
    await expect(page.getByText('6117812270')).toBeVisible();
    await expect(page.getByText('Order number', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Cancel — edit my order/i }).click();
    await expect(page.getByRole('heading', { name: 'Make payment' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Checkout/i })).toBeVisible();
    await expect(page.getByText(/Amala/i).first()).toBeVisible();
  });

  test('I have made payment saves order to database for admin', async ({ page }) => {
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
    await fillCheckout(page, 'Realtime Test Customer');
    await page.getByRole('button', { name: /Continue to payment/i }).click();
    await expect(page.getByRole('heading', { name: 'Make payment' })).toBeVisible();

    const orderNumber = (
      await page
        .getByText('Order number', { exact: true })
        .locator('xpath=following-sibling::p[1]')
        .textContent()
    )?.trim();
    expect(orderNumber).toMatch(/^AY-/);

    await page.getByRole('button', { name: /I have made payment/i }).click({ force: true });
    await expect(page.getByText('Your tracking number', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(orderNumber!, { exact: true }).first()).toBeVisible();

    // Public track page should resolve the live order without admin
    await page.goto(`/track?order=${orderNumber}`);
    await expect(page.getByText(orderNumber!, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Order Received/i).first()).toBeVisible();

    const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'contact@ayfoodpalace.com';
    const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '';
    if (!adminPassword) return;

    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(adminEmail);
    await page.getByLabel(/^Password$/i).fill(adminPassword);
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
    await expect(page.getByText('Realtime Test Customer').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(orderNumber!).first()).toBeVisible();
  });

  test('track page accepts order lookup UI', async ({ page }) => {
    await page.goto('/track');
    await expect(page.getByRole('heading', { name: /Track Your/i })).toBeVisible();
    await page.getByPlaceholder(/AY/i).fill('AY-DOES-NOT-EXIST');
    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByText(/Order not found/i)).toBeVisible();
  });

  test('place order, admin updates status, customer track reflects it', async ({ page }) => {
    const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'contact@ayfoodpalace.com';
    const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '';
    test.skip(!adminPassword, 'Set PLAYWRIGHT_ADMIN_PASSWORD to run full order+track flow');

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
    await fillCheckout(page, 'E2E Track Flow Customer');
    await page.getByRole('button', { name: /Continue to payment/i }).click();
    await expect(page.getByRole('heading', { name: 'Make payment' })).toBeVisible();

    const orderNumber = (
      await page
        .getByText('Order number', { exact: true })
        .locator('xpath=following-sibling::p[1]')
        .textContent()
    )?.trim();
    expect(orderNumber).toMatch(/^AY-/);

    await page.getByRole('button', { name: /I have made payment/i }).click({ force: true });
    await expect(page.getByText('Your tracking number', { exact: true })).toBeVisible({
      timeout: 25_000,
    });

    // Customer can track the new order
    await page.goto(`/track?order=${orderNumber}`);
    await expect(page.getByText(orderNumber!, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Order Received|In progress/i).first()).toBeVisible();

    // Admin updates status
    await page.goto('/admin/login');
    await page.getByLabel(/Email Address/i).fill(adminEmail);
    await page.getByLabel(/^Password$/i).fill(adminPassword);
    await page.getByRole('button', { name: /Sign In to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 20_000 });

    await page.goto('/admin/orders');
    await expect(page.getByText(orderNumber!).first()).toBeVisible({ timeout: 20_000 });

    // Expand the order card so the status select is available
    await page
      .getByRole('button')
      .filter({ hasText: orderNumber! })
      .first()
      .click();

    const statusSelect = page
      .locator('div')
      .filter({ has: page.getByText(orderNumber!, { exact: true }) })
      .locator('select')
      .first();
    await expect(statusSelect).toBeVisible({ timeout: 15_000 });
    await statusSelect.selectOption('PREPARING');
    await expect(page.getByText(/Order status updated successfully/i)).toBeVisible({
      timeout: 15_000,
    });

    // Customer track page shows updated status
    await page.goto(`/track?order=${orderNumber}`);
    await expect(page.getByText(/Preparing/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/In progress/i).first()).toBeVisible();
  });
});
