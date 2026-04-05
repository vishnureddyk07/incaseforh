import { test, expect } from '@playwright/test';

/** Critical flow: fill form, add contacts, ensure consent required */
test('Emergency form flow with dynamic contacts', async ({ page }) => {
  await page.route('**/api/v1/emergency', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Emergency info saved successfully', id: 'test-id' }),
    });
  });

  await page.goto('/');
  await page.locator('text=Emergency Information Registration').waitFor();

  await page.locator('input[name="fullName"]').fill('User Name');
  await page.locator('input[name="email"]').fill('user@example.com');
  await page.locator('input[name="phoneNumber"]').fill('9876543210');
  await page.locator('input[name="dateOfBirth"]').fill('2000-01-01');
  await page.locator('select[name="bloodType"]').selectOption('O+');

  await page.getByRole('button', { name: /add contact/i }).click();
  await page.getByRole('button', { name: 'Remove contact' }).nth(1).click();

  await page.getByPlaceholder('Contact name').first().fill('Contact One');
  await page.locator('input[aria-required="true"]').first().fill('+919876543211');

  const submit = page.getByRole('button', { name: /submit information/i });
  await expect(submit).toBeDisabled();

  await page.getByRole('checkbox').check();
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByText(/Success!/i)).toBeVisible({ timeout: 30000 });
});
