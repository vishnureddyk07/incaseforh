import { test, expect } from '@playwright/test';

/** Critical flow: fill form, add contacts, ensure consent required */
test('Emergency form flow with dynamic contacts', async ({ page }) => {
  await page.goto('/');
  // Jump to form section (hero CTA may exist)
  await page.locator('text=Emergency Information Registration').waitFor();

  // Full Name
  await page.getByLabel('Full Name').fill('User Name');
  // Email optional
  await page.getByLabel('Email').fill('user@example.com');
  // Phone
  await page.getByLabel(/Phone Number/i).fill('9876543210');
  // DOB
  await page.getByLabel(/Date of Birth/i).fill('2000-01-01');

  // Emergency Contacts section
  await page.getByRole('button', { name: /add/i }).click(); // 2nd contact
  // Fill first contact
  await page.getByPlaceholder('Contact name').first().fill('Contact One');
  await page.getByPlaceholder('+91 98765 43210').first().fill('+919876543210');
  // Fill second contact
  await page.getByPlaceholder('Contact name').nth(1).fill('Contact Two');
  await page.getByPlaceholder('+91 98765 43210').nth(1).fill('9876543210');

  // Consent required
  const submit = page.getByRole('button', { name: /submit information/i });
  await submit.click();
  await expect(page.getByText(/Please confirm your consent/i)).toBeVisible();

  // Check consent and submit
  await page.getByRole('checkbox').check();
  await submit.click();

  // Success popup expected
  await expect(page.getByText(/Success!/i)).toBeVisible({ timeout: 30000 });
});
