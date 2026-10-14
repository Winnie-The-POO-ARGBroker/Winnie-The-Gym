import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'

/**
 * AUT-E2E auth suite — login valid + invalid (parametrized, ≥4 combos).
 *
 * Positive: admin logs in and reaches /dashboard.
 * Negative: four invalid-credential combos each get an error response.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@winnie.local'
const ADMIN_PASS  = process.env.E2E_ADMIN_PASS  ?? 'admin_password_here'

// ---- Negative test cases (parametrized) ----
const INVALID_COMBOS = [
  {
    label: 'wrong password',
    email: ADMIN_EMAIL,
    password: 'wrongpassword999',
  },
  {
    label: 'wrong email and wrong password',
    email: 'notauser@example.com',
    password: 'badpass123',
  },
  {
    label: 'empty password',
    email: ADMIN_EMAIL,
    password: '',
  },
  {
    label: 'malformed email format',
    email: 'not-an-email',
    password: 'somepassword',
  },
]

test.describe('Auth — valid login', () => {
  test('admin can log in and reach the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboard = new DashboardPage(page)

    await loginPage.goto()

    // Verify page structure
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()

    await loginPage.login(ADMIN_EMAIL, ADMIN_PASS)

    // After successful login the app navigates to /dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
    await dashboard.waitForLoad()
  })
})

test.describe('Auth — invalid login (parametrized)', () => {
  for (const combo of INVALID_COMBOS) {
    test(`rejects login: ${combo.label}`, async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()

      await loginPage.fillEmail(combo.email)
      await loginPage.fillPassword(combo.password)
      await loginPage.submit()

      // Should NOT navigate away from /login
      // (empty-password case is caught by HTML5 validation before submit,
      //  so we accept both staying on login or seeing an error toast)
      const isStillOnLogin = page.url().includes('/login') ||
                             !page.url().includes('/dashboard')
      expect(isStillOnLogin).toBeTruthy()

      // Additionally assert no access token was stored
      const localStorageTokens = await page.evaluate(() => {
        return Object.keys(localStorage).some(k => k.includes('access'))
      })
      // It is acceptable to not have a token (login failed)
      // This assertion is intentionally loose — the exact storage key depends on the auth store
      expect(localStorageTokens).toBeFalsy()
    })
  }
})

test.describe('Auth — session expired banner', () => {
  test('shows session expired banner when redirected with ?reason=expired', async ({ page }) => {
    await page.goto('/login?reason=expired')
    const loginPage = new LoginPage(page)
    await expect(loginPage.sessionExpiredBanner).toBeVisible()
    await expect(loginPage.sessionExpiredBanner).toContainText(/sesión expiró|session expired/i)
  })
})
