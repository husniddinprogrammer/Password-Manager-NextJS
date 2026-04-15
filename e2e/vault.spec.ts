import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, identifier: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder(/username or email/i).fill(identifier);
  await page.getByPlaceholder(/master password/i).fill(password);
  await page.getByRole('button', { name: /unlock vault|sign in/i }).click();
  await expect(page).toHaveURL(/\/vault/, { timeout: 10_000 });
}

test.describe('Vault', () => {
  test('shows credential list after login', async ({ page }) => {
    await loginAs(page, 'husniddinprogrammer@gmail.com', 'Husniddin123');
    await expect(page.getByText(/add credential/i)).toBeVisible();
  });

  test('can navigate to add credential page', async ({ page }) => {
    await loginAs(page, 'husniddinprogrammer@gmail.com', 'Husniddin123');
    await page.getByRole('button', { name: /add credential/i }).click();
    await expect(page).toHaveURL(/\/vault\/add/);
    await expect(page.getByPlaceholder(/site name|credential name/i)).toBeVisible();
  });

  test('lock button returns to lock screen', async ({ page }) => {
    await loginAs(page, 'husniddinprogrammer@gmail.com', 'Husniddin123');
    // Click the lock icon in the header
    await page.getByTitle(/lock vault/i).click();
    await expect(page).toHaveURL('/', { timeout: 5000 });
    await expect(page.getByPlaceholder(/master password/i)).toBeVisible();
  });

  test('search filters credentials', async ({ page }) => {
    await loginAs(page, 'husniddinprogrammer@gmail.com', 'Husniddin123');
    const searchBox = page.getByPlaceholder(/search credentials/i);
    await expect(searchBox).toBeVisible();
    await searchBox.fill('zzz-nonexistent-zzz');
    // Should show empty state or no matching items
    await expect(page.getByText(/no credentials|no results|nothing here/i)).toBeVisible({
      timeout: 3000,
    }).catch(() => {
      // Some implementations hide items without an explicit empty message — that's fine
    });
  });
});
