import { type Page, type Locator, expect } from '@playwright/test'

/**
 * DashboardPage — post-login admin dashboard.
 *
 * Used to verify successful login and to navigate to sub-sections.
 */
export class DashboardPage {
  readonly page: Page
  readonly heading: Locator
  readonly navPlanes: Locator
  readonly navSocios: Locator
  readonly navClases: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByTestId('dashboard-heading').or(
      page.getByRole('heading', { level: 1 })
    )
    this.navPlanes = page.getByRole('link', { name: /planes/i })
    this.navSocios = page.getByRole('link', { name: /socios/i })
    this.navClases = page.getByRole('link', { name: /clases/i })
  }

  async waitForLoad() {
    await expect(this.page).toHaveURL(/dashboard/)
    // Wait until at least one navigation link is visible
    await expect(this.navPlanes.or(this.navSocios)).toBeVisible({ timeout: 8000 })
  }

  async goToPlanes() {
    await this.navPlanes.click()
    await expect(this.page).toHaveURL(/planes/)
  }

  async goToSocios() {
    await this.navSocios.click()
    await expect(this.page).toHaveURL(/socios/)
  }
}
