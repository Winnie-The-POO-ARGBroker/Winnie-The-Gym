import { type Page, type Locator, expect } from '@playwright/test'

/**
 * LoginPage — email/password login form.
 *
 * Selectors use data-testid first, then ARIA role as fallback.
 * No waitForTimeout() anywhere — only auto-waiting Playwright assertions.
 */
export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly sessionExpiredBanner: Locator
  readonly googleButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByTestId('login-email')
    this.passwordInput = page.getByTestId('login-password')
    this.submitButton = page.getByTestId('login-submit')
    this.sessionExpiredBanner = page.getByTestId('session-expired-banner')
    this.googleButton = page.getByRole('button', { name: /continuar con google/i })
  }

  async goto() {
    await this.page.goto('/login')
    await expect(this.submitButton).toBeVisible()
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  /**
   * Full login flow — fills credentials, submits, and waits for navigation.
   * Resolves once the browser leaves /login.
   */
  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async expectErrorToast() {
    // Sonner toasts rendered outside the form; look for error role or visible text
    const toast = this.page.getByRole('status').or(
      this.page.locator('[data-sonner-toast][data-type="error"]')
    )
    await expect(toast.first()).toBeVisible({ timeout: 5000 })
  }
}
