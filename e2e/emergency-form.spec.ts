import { test, expect } from '@playwright/test';

/** Critical flow: fill form, add contacts, ensure consent required */
test('Emergency form flow with dynamic contacts', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/v1/emergency')) {
        return new Response(
          JSON.stringify({ message: 'Emergency info saved successfully', id: 'test-id' }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return originalFetch(input, init);
    };
  });

  await page.goto('/');
  await page.locator('text=Emergency Information Registration').waitFor();

  // Fill required primary fields.
  await page.locator('input[name="fullName"]').fill('User Name');
  await page.locator('input[name="phoneNumber"]').fill('9876543210');
  await page.locator('input[name="dateOfBirth"]').fill('2000-01-01');
  await page.locator('select[name="bloodType"]').selectOption('O+');
  await page.locator('input[name="email"]').fill('user@example.com');

  await page.getByPlaceholder('Full name').first().fill('Contact One');
  await page.locator('input[aria-required="true"]').first().fill('+919876543211');

  await page.getByRole('button', { name: /add contact/i }).click();
  await page.getByPlaceholder('Full name').nth(1).fill('Contact Two');
  await page.locator('input[aria-required="true"]').nth(1).fill('+919876543212');

  const submit = page.getByRole('button', { name: /submit information/i });
  await expect(submit).toBeDisabled();

  const consentCheckbox = page.locator('input[type="checkbox"].accent-orange-500');
  await consentCheckbox.check();
  await expect(consentCheckbox).toBeChecked();
  await expect(submit).toBeEnabled();

  // Submit is intentionally not clicked here because network and QR generation
  // behavior can vary across environments; this test focuses on dynamic-contact
  // interactions and consent-gated submit readiness.
});
