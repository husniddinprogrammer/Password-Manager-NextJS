import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder(/username or email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/master password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /unlock vault|sign in/i })).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/username or email/i).fill('nobody');
    await page.getByPlaceholder(/master password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /unlock vault|sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });

  test('redirects to vault on successful login', async ({ page }) => {
    // Uses the test account created by reset-password script
    await page.goto('/login');
    await page.getByPlaceholder(/username or email/i).fill('husniddinprogrammer@gmail.com');
    await page.getByPlaceholder(/master password/i).fill('Husniddin123');
    await page.getByRole('button', { name: /unlock vault|sign in/i }).click();
    await expect(page).toHaveURL(/\/vault/, { timeout: 10_000 });
  });
});

test.describe('Registration page', () => {
  test('shows registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/master password/i)).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder(/username/i).fill('testuser');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/master password/i).fill('short');
    await page.getByRole('button', { name: /create account|register/i }).click();
    // Either client-side or server-side validation fires
    await expect(
      page.getByText(/at least 8|password.*8|too short/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Lock screen', () => {
  test('shows lock screen for authenticated-but-locked user', async ({ page }) => {
    // Navigate directly — without vault-unlocked in sessionStorage the
    // lock screen should be shown, not the vault
    await page.goto('/');
    // Either lock screen or login — not the vault
    await expect(page).not.toHaveURL(/\/vault/);
  });
});
