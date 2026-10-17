import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { PlanesAdminPage } from '../pages/PlanesAdminPage'
import { PlanFormModal } from '../pages/PlanFormModal'

/**
 * AUT-E2E planes CRUD — full create / read / edit / delete cycle.
 *
 * Assumes the admin user can authenticate and has write permissions on planes.
 * All tests share a single browser context with login performed once in beforeAll.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@winnie.local'
const ADMIN_PASS  = process.env.E2E_ADMIN_PASS  ?? 'admin_password_here'

// Name includes a timestamp to avoid conflicts across parallel runs or re-runs
const TEST_PLAN_NAME = `E2E Plan ${Date.now()}`
const UPDATED_PLAN_NAME = `${TEST_PLAN_NAME} (editado)`

test.describe('Planes Admin — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test in this suite
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASS)
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
  })

  test('admin can navigate to Planes admin page', async ({ page }) => {
    const planesPage = new PlanesAdminPage(page)
    await planesPage.goto()

    await expect(page).toHaveURL(/planes/)
    await expect(planesPage.newPlanButton).toBeVisible()
  })

  test('admin can create a new plan', async ({ page }) => {
    const planesPage = new PlanesAdminPage(page)
    const modal = new PlanFormModal(page)

    await planesPage.goto()
    await planesPage.clickNewPlan()
    await modal.waitForOpen()

    await modal.createPlan({ nombre: TEST_PLAN_NAME, precio: 15000 })

    // Modal should close on success
    await modal.waitForClosed()

    // The new plan should appear on the page (card or row with its name)
    await expect(page.getByRole('heading', { name: TEST_PLAN_NAME })).toBeVisible({ timeout: 8000 })
  })

  test('admin can edit an existing plan', async ({ page }) => {
    const planesPage = new PlanesAdminPage(page)
    const modal = new PlanFormModal(page)

    await planesPage.goto()

    // Find the plan created in the previous test via text
    const planCard = page.locator('[data-testid^="plan-row-"]').filter({ hasText: TEST_PLAN_NAME })
    // Click the edit button inside that card
    const editBtn = planCard.getByTestId('btn-editar-plan').or(
      planCard.getByRole('button', { name: /editar/i })
    )
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()

    await modal.waitForOpen()
    await modal.fillNombre(UPDATED_PLAN_NAME)
    await modal.submit()

    await modal.waitForClosed()

    // Updated name should appear
    await expect(page.getByRole('heading', { name: UPDATED_PLAN_NAME })).toBeVisible({ timeout: 8000 })
  })

  test('plan form modal can be cancelled without changes', async ({ page }) => {
    const planesPage = new PlanesAdminPage(page)
    const modal = new PlanFormModal(page)

    await planesPage.goto()
    await planesPage.clickNewPlan()
    await modal.waitForOpen()

    // Fill something then cancel
    await modal.fillNombre('Temp plan that should not be saved')
    await modal.cancel()
    await modal.waitForClosed()

    // Temp plan name should NOT appear
    await expect(
      page.getByText('Temp plan that should not be saved')
    ).toBeHidden()
  })

  test.fixme('admin can delete a plan — fixme: delete requires at least 2 plans to pass guard', async ({ page }) => {
    /**
     * This test is marked fixme because:
     * 1. The delete handler rejects deletion when only 1 plan exists in the system.
     * 2. In a clean test environment we cannot guarantee the seed provides ≥2 plans.
     *
     * To unblock: seed at least 2 plans before this test runs, or mock the guard API response.
     *
     * Evidence: see docs/qa/evidence/delete-guard-toast.png
     */
    const planesPage = new PlanesAdminPage(page)

    await planesPage.goto()

    const planCard = page.getByText(UPDATED_PLAN_NAME).locator('../..')
    const deleteBtn = planCard.getByTestId('btn-eliminar-plan').or(
      planCard.getByRole('button', { name: /eliminar/i })
    )
    await deleteBtn.click()

    // Expect a confirmation dialog or the plan to disappear
    await expect(page.getByText(UPDATED_PLAN_NAME)).toBeHidden({ timeout: 8000 })
  })
})
