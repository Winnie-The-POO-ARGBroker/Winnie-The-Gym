/**
 * Automated accessibility audit (axe-core + Playwright) — WCAG 2.2 AA.
 *
 * Logs in once per role and audits the main screens of each one, then writes a
 * JSON report and exits with code 1 when any `critical` or `serious` violation
 * is found, so it can be used as a CI gate.
 *
 * Usage (stack running with `docker compose up`, users from `seed_demo_users`):
 *   DEMO_USER_PASSWORD=<seed password> node frontend/scripts/audit-accessibility.mjs
 *
 * Output: docs/qa/evidence/accesibilidad/axe-report.json
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const PASSWORD = process.env.DEMO_USER_PASSWORD;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING = new Set(['critical', 'serious']);

const SESSIONS = [
  { role: 'público', email: null, routes: [['/login', 'Login'], ['/registro', 'Registro'], ['/forgot-password', 'Recuperar contraseña']] },
  { role: 'administrador', email: 'admin@winnie.local', routes: [['/dashboard', 'Dashboard'], ['/admin/socios', 'Gestión de socios'], ['/admin/clases', 'Clases'], ['/admin/planes', 'Planes'], ['/admin/pagos', 'Pagos'], ['/perfil', 'Mi perfil']] },
  { role: 'recepcionista', email: 'recepcion@winnie.local', routes: [['/recepcion/acceso', 'Control de accesos'], ['/recepcion/aforo', 'Aforo en vivo']] },
  { role: 'socio', email: 'socio.activo@winnie.local', routes: [['/socio/credencial', 'Credencial digital'], ['/socio/clases', 'Catálogo de clases'], ['/socio/pagos', 'Mis pagos']] },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(here, '../../docs/qa/evidence/accesibilidad');

async function login(page, email) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 15000 });
}

async function audit(page, route, name, role) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  const landed = new URL(page.url()).pathname;
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return {
    role, route, name, landedOn: landed, redirected: landed !== route,
    violations: violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.length,
      sample: v.nodes[0]?.target?.join(' ') ?? null,
    })),
  };
}

if (SESSIONS.some((s) => s.email) && !PASSWORD) throw new Error('Set DEMO_USER_PASSWORD (see backend seed_demo_users).');

const browser = await chromium.launch();
const results = [];
for (const session of SESSIONS) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 820 } });
  const page = await context.newPage();
  if (session.email) await login(page, session.email);
  for (const [route, name] of session.routes) {
    const r = await audit(page, route, name, session.role);
    results.push(r);
    const blocking = r.violations.filter((v) => BLOCKING.has(v.impact)).length;
    console.log(`${r.role.padEnd(14)} ${route.padEnd(22)} violaciones=${String(r.violations.length).padStart(2)} críticas/serias=${blocking}${r.redirected ? `  (redirigió a ${r.landedOn})` : ''}`);
  }
  await context.close();
}
await browser.close();

const all = results.flatMap((r) => r.violations);
const summary = {
  generatedAt: new Date().toISOString(), baseUrl: BASE_URL, tags: TAGS,
  screens: results.length,
  totals: { violations: all.length, critical: all.filter((v) => v.impact === 'critical').length, serious: all.filter((v) => v.impact === 'serious').length, moderate: all.filter((v) => v.impact === 'moderate').length, minor: all.filter((v) => v.impact === 'minor').length },
};
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'axe-report.json'), JSON.stringify({ summary, results }, null, 2));
console.log('\nResumen:', summary.totals, `→ ${path.relative(process.cwd(), path.join(OUT_DIR, 'axe-report.json'))}`);
process.exit(summary.totals.critical + summary.totals.serious > 0 ? 1 : 0);
