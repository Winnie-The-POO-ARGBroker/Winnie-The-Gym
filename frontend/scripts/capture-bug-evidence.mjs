// Captures reproducible screenshot + API evidence for the bugs documented in docs/backlog.
// Usage (stack running via docker compose, seed users loaded with `seed_demo_users`):
//   DEMO_USER_PASSWORD=<seed password> node frontend/scripts/capture-bug-evidence.mjs
// Output: docs/qa/evidence/bugs/<BK-ID>_<slug>.png and docs/qa/evidence/bugs/api-evidence.json
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const PASSWORD = process.env.DEMO_USER_PASSWORD;
if (!PASSWORD) throw new Error('Set DEMO_USER_PASSWORD (see backend seed_demo_users).');

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../docs/qa/evidence/bugs');
const PDF = path.resolve(tmpdir(), 'apto-medico-demo.pdf');
mkdirSync(OUT, { recursive: true });

const MINIMAL_PDF = '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
writeFileSync(PDF, MINIMAL_PDF);

const browser = await chromium.launch();
const evidence = { browser: `Chromium ${browser.version()} (Playwright)`, capturedAt: new Date().toISOString(), apiCalls: {} };
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };

async function session(email, contextOptions = {}, tag = email) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 820 }, ...contextOptions });
  const page = await context.newPage();
  page.on('response', async (res) => {
    const url = res.url();
    if (!/\/api\/(auth\/profile|payments\/pagos|members\/socios|classes\/clases)/.test(url)) return;
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON */ }
    (evidence.apiCalls[tag] ??= []).push({
      method: res.request().method(), url: url.replace(BASE, ''), status: res.status(),
      count: body?.count, results: body?.results?.length, detail: body?.detail,
    });
  });
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 15000 });
  await settle(page);
  return page;
}

// BK-BUG-03 — "Crear staff" button missing on Usuarios
let page = await session('admin@winnie.local', {}, 'admin');
await page.goto(`${BASE}/admin/usuarios`); await settle(page);
await shot(page, 'BK-BUG-03_usuarios-sin-boton-crear-staff');

// BK-BUG-01 — staff profile returns 404 (UI shows empty form, error is silent)
await page.goto(`${BASE}/perfil`); await settle(page);
await shot(page, 'BK-BUG-01_perfil-admin-formulario-vacio');

// BK-BUG-04 — "Clase no encontrada" from the attendance terminal link
page = await session('recepcion@winnie.local', {}, 'recepcion');
await page.getByRole('link', { name: /^Clases/ }).first().click(); await settle(page);
await page.getByRole('button', { name: /Lista y Detalle/ }).or(page.getByText('Lista y Detalle')).first().click(); await settle(page);
await shot(page, 'BK-BUG-04_clases-lista-detalle');
await page.getByRole('button', { name: /Ver lista de inscriptos/ }).click(); await settle(page);
await shot(page, 'BK-BUG-04_modal-inscriptos-con-enlace');
const terminalLink = page.getByText(/terminal completa de asistencia/i).first();
if (await terminalLink.count()) {
  await terminalLink.click(); await page.waitForTimeout(1500);
  evidence.bug04FinalUrl = page.url();
  await shot(page, 'BK-BUG-04_clase-no-encontrada');
}

// BK-SOC-03 — payments tab lists payments of other members (member 9 has none)
page = await session('admin@winnie.local', {}, 'admin-socios');
await page.goto(`${BASE}/admin/socios`); await settle(page);
const row = page.locator('tbody tr', { hasText: 'S-00009' }).first();
if (await row.count()) {
  await row.click(); await settle(page);
  await page.getByText(/^Pagos$/).first().click(); await settle(page);
  await shot(page, 'BK-SOC-03_ficha-socio-pagos-ajenos');
}

// BK-SOC-02 — certificate upload does nothing
page = await session('socio.nuevo@winnie.local', {}, 'socio-nuevo');
await page.goto(`${BASE}/perfil`); await settle(page);
await shot(page, 'BK-SOC-02_perfil-antes-de-subir-apto');
let uploadRequests = 0;
page.on('request', (r) => { if (r.method() !== 'GET' && /\/api\//.test(r.url())) uploadRequests += 1; });
await page.locator('input[type=file]').first().setInputFiles(PDF);
await page.waitForTimeout(2000);
evidence.bugSoc02NonGetApiRequestsAfterUpload = uploadRequests;
await shot(page, 'BK-SOC-02_perfil-despues-de-subir-apto-sin-cambios');

// BK-MOB-02 — member bottom nav missing on /dashboard, /perfil, /socio/pagos (iPhone SE)
page = await session('socio.activo@winnie.local', { ...devices['iPhone SE'] }, 'socio-mobile');
for (const [route, name] of [['/socio/credencial', 'credencial-con-nav'], ['/dashboard', 'dashboard-sin-nav'], ['/perfil', 'perfil-sin-nav'], ['/socio/pagos', 'pagos-sin-nav']]) {
  await page.goto(`${BASE}${route}`); await settle(page);
  const hasBottomNav = await page.evaluate(() => [...document.querySelectorAll('nav')].some((n) => getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().bottom >= window.innerHeight - 2));
  (evidence.bugMob02 ??= {})[route] = { bottomNavVisible: hasBottomNav };
  await shot(page, `BK-MOB-02_${name}`);
}

writeFileSync(path.join(OUT, 'api-evidence.json'), JSON.stringify(evidence, null, 2));
await browser.close();
console.log('Evidence written to', OUT);
