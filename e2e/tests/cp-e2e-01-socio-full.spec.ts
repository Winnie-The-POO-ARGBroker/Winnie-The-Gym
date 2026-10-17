import { test, expect } from '@playwright/test'

/**
 * CP-E2E-01 — Nuevo socio self-service: registro completo hasta acceso concedido.
 *
 * Reference: docs/qa/casos-e2e/CP-E2E-01-nuevo-socio-self-service.md
 * HU: US01, US04, US06, US07 — Priority P0.
 *
 * ⚠️ MercadoPago phase (Fase 4) and QR access phase (Fase 5) require external
 *    services (MercadoPago sandbox, QR scanner emulation). Those steps are marked
 *    fixme until a fake webhook / mock redirect is in place.
 *
 * Preconditions:
 *   - Backend running with seed_demo_users executed.
 *   - Frontend at localhost:5173.
 *   - At least 1 active PlanMembresia in the DB.
 *   - Email catcher (Mailpit) running at localhost:8025 (only needed for activation link).
 */

const BASE_URL   = process.env.E2E_BASE_URL   ?? 'http://localhost:5173'
const MAILPIT_URL = process.env.MAILPIT_URL   ?? 'http://localhost:8025'
const API_URL    = process.env.E2E_API_URL    ?? 'http://localhost:8000'

// Dynamic test data to avoid conflicts across runs
const TIMESTAMP  = Date.now()
const TEST_EMAIL = `e2e.socio.${TIMESTAMP}@test.local`
const TEST_DNI   = `55${String(TIMESTAMP).slice(-6)}`
const TEST_PASS  = 'Winnie2026!'

test.describe('CP-E2E-01 — Socio self-service full flow', () => {
  // ---- Fase 1: Registro público ----
  test.describe('Fase 1 — Registro público', () => {
    // fixme: with the local stack the registration request never resolves (the button stays on
    // "Cargando..."), so the flow can't be asserted. Needs Mailpit/Celery up and a fast response.
    test.fixme('socio can complete the public registration form', async ({ page }) => {
      await page.goto(`${BASE_URL}/registro`)

      // Wait for form to load
      await expect(page.getByRole('heading', { name: /registro|crear cuenta/i })).toBeVisible({ timeout: 8000 })

      // Fill registration form fields — data-testid preferred
      const nombreInput = page.getByTestId('register-nombre').or(
        page.getByLabel(/nombre/i)
      )
      const apellidoInput = page.getByTestId('register-apellido').or(
        page.getByLabel(/apellido/i)
      )
      const emailInput = page.getByTestId('register-email').or(
        page.getByLabel(/email/i)
      )
      const dniInput = page.getByTestId('register-dni').or(
        page.getByLabel(/dni/i)
      )
      const telefonoInput = page.getByTestId('register-telefono').or(
        page.getByLabel(/teléfono|telefono/i)
      )
      const passwordInput = page.getByTestId('register-password').or(
        page.getByLabel(/contraseña/i).first()
      )
      const passwordConfirmInput = page.getByTestId('register-password-confirm')
      const submitButton = page.getByRole('button', { name: /registrar|crear cuenta/i })

      await nombreInput.fill('E2E')
      await apellidoInput.fill('Candidato')
      await emailInput.fill(TEST_EMAIL)
      await dniInput.fill(TEST_DNI)
      await telefonoInput.fill('+5493511234567')
      await passwordInput.fill(TEST_PASS)
      await passwordConfirmInput.fill(TEST_PASS)
      await submitButton.click()

      // Successful registration signs the user in and lands on the dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
    })
  })

  // ---- Fase 2: Activación por email ----
  test.describe('Fase 2 — Activación de cuenta', () => {
    test.fixme(
      'activation link in email sets password and redirects to login',
      async ({ page }) => {
        /**
         * fixme: Requires Mailpit running and an interceptable activation email.
         *
         * Full flow:
         * 1. Query Mailpit API for email sent to TEST_EMAIL.
         * 2. Extract activation link from email body.
         * 3. Navigate to that link.
         * 4. Set password + submit.
         * 5. Assert redirect to /login with "Cuenta activada" message.
         *
         * Evidence: this step is covered in backend unit tests:
         *   test_activation_email_token_accepted_by_password_reset_confirm (PR #318)
         *
         * Unblock by ensuring Mailpit is included in docker compose and
         * EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend points to Mailpit.
         */
        const mailpitResponse = await page.request.get(`${MAILPIT_URL}/api/v1/messages`)
        const messages = await mailpitResponse.json()
        const activationEmail = messages.messages?.find(
          (m: { To: Array<{ Address: string }> }) => m.To.some((t) => t.Address === TEST_EMAIL)
        )
        expect(activationEmail).toBeDefined()
      }
    )
  })

  // ---- Fase 3: Cert médico self-service ----
  test.describe('Fase 3 — Certificado médico', () => {
    test.fixme(
      'authenticated socio can upload a medical certificate',
      async ({ page }) => {
        /**
         * fixme: Requires a fully activated account to authenticate.
         * Depends on Fase 2 completing successfully in CI.
         *
         * Steps (once Fase 2 is unblocked):
         * 1. Login with TEST_EMAIL + TEST_PASS.
         * 2. Navigate to /perfil.
         * 3. Click "Subir certificado médico".
         * 4. Attach docs/qa/evidence/cert-medico-test.pdf.
         * 5. Assert toast "Certificado subido correctamente".
         * 6. Assert UI shows "Certificado cargado" with file link.
         */
        await page.goto(`${BASE_URL}/perfil`)
        const uploadBtn = page.getByTestId('btn-subir-certificado').or(
          page.getByRole('button', { name: /subir certificado/i })
        )
        await expect(uploadBtn).toBeVisible()

        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadBtn.click(),
        ])
        await fileChooser.setFiles('docs/qa/evidence/cert-medico-test.pdf')

        await expect(
          page.getByText(/certificado subido correctamente/i)
        ).toBeVisible({ timeout: 8000 })
      }
    )
  })

  // ---- Fase 4: Checkout plan ----
  test.describe('Fase 4 — Checkout plan', () => {
    test.fixme(
      'authenticated socio can initiate checkout and reach MercadoPago',
      async ({ page }) => {
        /**
         * fixme: MercadoPago redirect is external — requires a fake webhook or
         * a test double for the MP SDK preference creation endpoint.
         *
         * Until that mock is available we validate the pre-redirect UI only.
         * Full redirect + return flow requires:
         *   - Mock POST /api/payments/mp/preference/ returning a test sandbox URL.
         *   - Playwright route interception for the MP domain.
         */

        // Mock the MercadoPago preference creation to avoid external calls
        await page.route('**/api/payments/**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              init_point: `${BASE_URL}/socio/credencial?pago=exito`,
            }),
          })
        })

        await page.goto(`${BASE_URL}/socio/checkout`)

        const payBtn = page.getByRole('button', { name: /pagar/i }).first()
        await expect(payBtn).toBeVisible({ timeout: 8000 })
        await payBtn.click()

        // With mock: redirects to /socio/credencial?pago=exito
        await expect(page).toHaveURL(/pago=exito/, { timeout: 10000 })
      }
    )
  })

  // ---- Fase 5: Acceso por QR ----
  test.describe('Fase 5 — Acceso por QR', () => {
    test.fixme(
      'socio credential page shows QR and access terminal registers entry',
      async ({ page }) => {
        /**
         * fixme: QR scan emulation requires a second browser context acting as
         * the reception terminal and a QR decode library or direct API call.
         *
         * Full flow documented in CP-E2E-01 §22–28:
         * 1. Navigate /socio/credencial — assert QR visible.
         * 2. Extract QR value (canvas or img alt).
         * 3. POST decoded token to /api/access/scan/ with mode=ENTRY.
         * 4. Assert ValidationResult === "Entrada registrada".
         * 5. Switch mode=EXIT, scan again, assert "Salida registrada".
         *
         * Backend coverage: test_exit_with_expired_membership_returns_granted (PR #319)
         */
        await page.goto(`${BASE_URL}/socio/credencial`)
        const qr = page.getByTestId('socio-qr').or(
          page.getByRole('img', { name: /qr/i })
        )
        await expect(qr).toBeVisible({ timeout: 8000 })
      }
    )
  })
})

// ---- Smoke: registration page is publicly accessible ----
test('registration page loads without authentication', async ({ page }) => {
  await page.goto(`${BASE_URL}/registro`)
  await expect(page).toHaveURL(/registro/)
  // Form or heading should be visible
  const formOrHeading = page
    .getByRole('heading')
    .or(page.getByRole('form'))
    .first()
  await expect(formOrHeading).toBeVisible({ timeout: 8000 })
})
