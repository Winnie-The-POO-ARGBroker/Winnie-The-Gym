import { type Page, type Locator, expect } from '@playwright/test'

/**
 * SocioCheckoutPage — plan selection and payment initiation for socios.
 *
 * In automated tests the MercadoPago redirect is mocked via API interception;
 * this page object covers the pre-redirect UI steps only.
 */
export class SocioCheckoutPage {
  readonly page: Page
  readonly planList: Locator
  readonly successBanner: Locator

  constructor(page: Page) {
    this.page = page
    this.planList = page.getByTestId('checkout-plan-list').or(
      page.getByRole('list').filter({ hasText: /pagar/i })
    )
    this.successBanner = page.getByTestId('checkout-success-banner').or(
      page.getByRole('alert').filter({ hasText: /pago.*éxito|éxito.*pago/i })
    )
  }

  async goto() {
    await this.page.goto('/socio/checkout')
  }

  async waitForPlans() {
    await expect(this.planList.or(
      this.page.getByRole('button', { name: /pagar/i }).first()
    )).toBeVisible({ timeout: 8000 })
  }

  /**
   * Click the pay button for the first available active plan.
   */
  async payFirstPlan() {
    const payButton = this.page.getByRole('button', { name: /pagar/i }).first()
    await expect(payButton).toBeVisible()
    await payButton.click()
  }

  async expectSuccessBanner() {
    await expect(this.successBanner).toBeVisible({ timeout: 8000 })
  }
}
