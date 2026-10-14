import { type Page, type Locator, expect } from '@playwright/test'

/**
 * PlanFormModal — modal for creating and editing membership plans.
 *
 * Selector priority: data-testid > ARIA role > label text. No XPath.
 */
export class PlanFormModal {
  readonly page: Page
  readonly nombreInput: Locator
  readonly precioInput: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator
  readonly modal: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.getByRole('dialog')
    this.nombreInput = page.getByTestId('plan-form-nombre')
    this.precioInput = page.getByTestId('plan-form-precio')
    this.submitButton = page.getByTestId('plan-form-submit')
    this.cancelButton = page.getByRole('button', { name: /cancelar/i })
  }

  async waitForOpen() {
    await expect(this.modal).toBeVisible({ timeout: 5000 })
    await expect(this.nombreInput).toBeVisible()
  }

  async waitForClosed() {
    await expect(this.modal).toBeHidden({ timeout: 5000 })
  }

  async fillNombre(nombre: string) {
    await this.nombreInput.clear()
    await this.nombreInput.fill(nombre)
  }

  async fillPrecio(precio: string | number) {
    await this.precioInput.clear()
    await this.precioInput.fill(String(precio))
  }

  async submit() {
    await this.submitButton.click()
  }

  async cancel() {
    await this.cancelButton.click()
  }

  /**
   * Convenience: fill the minimum required fields and submit.
   */
  async createPlan(opts: { nombre: string; precio: number }) {
    await this.fillNombre(opts.nombre)
    await this.fillPrecio(opts.precio)
    await this.submit()
  }
}
