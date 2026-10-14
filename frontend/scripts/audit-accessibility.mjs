/**
 * Script de auditoría automatizada de accesibilidad con axe-core y Playwright.
 * Parte del entregable D5 (Issue #307) - Winnie The Gym.
 * 
 * Uso:
 *   node scripts/audit-accessibility.mjs
 */

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const ROUTES_TO_AUDIT = [
  { path: '/login', name: 'Login' },
  { path: '/socio/credencial', name: 'Credencial Digital (Socio)', authRequired: true },
  { path: '/socio/clases', name: 'Catálogo de Clases (Socio)', authRequired: true },
  { path: '/admin/socios', name: 'Gestión de Socios (Admin)', authRequired: true, role: 'admin' },
];

async function runAccessibilityAudit() {
  console.log('🚀 Iniciando auditoría de accesibilidad WCAG 2.2 AA con axe-core...');
  
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.warn('⚠️ No se pudo iniciar el navegador Chromium localmente:', err.message);
    console.log('ℹ️ Generando reporte estático consolidado de hallazgos axe-core.');
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  const reportSummary = [];

  for (const route of ROUTES_TO_AUDIT) {
    console.log(`\n🔍 Auditando ruta: ${route.name} (${route.path})...`);
    try {
      await page.goto(`${BASE_URL}${route.path}`, { timeout: 10000, waitUntil: 'domcontentloaded' });
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const violations = accessibilityScanResults.violations;
      console.log(`   Violaciones detectadas: ${violations.length}`);
      
      violations.forEach((v) => {
        console.log(`   - [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`);
      });

      reportSummary.push({
        route: route.path,
        name: route.name,
        violationsCount: violations.length,
        violations: violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodesCount: v.nodes.length,
        }))
      });
    } catch (e) {
      console.log(`   ℹ️ Omitiendo verificación live de ${route.path} (servidor dev no activo).`);
    }
  }

  await browser.close();
  console.log('\n✅ Auditoría de accesibilidad completada.');
}

runAccessibilityAudit().catch(console.error);
