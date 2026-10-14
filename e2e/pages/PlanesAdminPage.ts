import { type Page, type Locator, expect } from '@playwright/test'

/**
 * PlanesAdminPage — admin view for membership plan management.
 *
 * Selector priority: data-testid > ARIA role > text. No XPath.
 */
export class PlanesAdminPage {
  readonly page: Page
  readonly newPlanButton: Locator
  readonly planCards: Locator

  constructor(page: Page) {
    this.page = page
    this.newPlanButton = page.getByTestId('btn-nuevo-plan')
    this.planCards = page.getByTestId(/^plan-row-/)
  }

  async goto() {
    await this.page.goto('/admin/planes')
    await expect(this.newPlanButton).toBeVisible({ timeout: 8000 })
  }

  async waitForLoad() {
    await expect(this.page).toHaveURL(/planes/)
    await expect(this.newPlanButton).toBeVisible({ timeout: 8000 })
  }

  async clickNewPlan() {
    await this.newPlanButton.click()
  }

  /**
   * Returns the plan row locator for a specific plan id.
   */
  planRow(id: string | number): Locator {
    return this.page.getByTestId(`plan-row-${id}`)
  }

  /**
   * Returns the edit button within a specific plan card.
   * Prefers data-testid; falls back to ARIA role inside the row.
   */
  editButtonInRow(rowLocator: Locator): Locator {
    return rowLocator.getByTestId('btn-editar-plan').or(
      rowLocator.getByRole('button', { name: /editar/i })
    )
  }

  /**
   * Returns the delete button within a specific plan card.
   */
  deleteButtonInRow(rowLocator: Locator): Locator {
    return rowLocator.getByTestId('btn-eliminar-plan').or(
      rowLocator.getByRole('button', { name: /eliminar/i })
    )
  }

  /**
   * Waits for the plan count badge / subtitle to update.
   */
  async expectPlanCountToContain(count: number) {
    await expect(
      this.page.getByText(new RegExp(`${count} planes?`, 'i'))
    ).toBeVisible({ timeout: 5000 })
  }
}
