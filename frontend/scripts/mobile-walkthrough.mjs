import { chromium, devices } from 'playwright'; // npm i -D playwright

const iPhone = devices['iPhone SE'];

const routes = [
  { path: '/socio/credencial', name: 'credencial' },
  { path: '/socio/clases', name: 'clases' },
  { path: '/socio/checkout', name: 'checkout' },
];

const browser = await chromium.launch();
const context = await browser.newContext({ ...iPhone });
const page = await context.newPage();

// Login primero
await page.goto('http://localhost:5173/login');
await page.fill('[name=email]', 'socio.activo@winnie.local');
await page.fill('[name=password]', 'Demo1234!');
await page.click('button[type=submit]');
await page.waitForURL(/socio|dashboard/);

for (const route of routes) {
  await page.goto(`http://localhost:5173${route.path}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: `../docs/qa/screenshots/mobile/${route.name}.png`, 
    fullPage: true,
  });

  // Validación real de overflow en viewport móvil
  const hasOverflow = await page.evaluate(() => 
    document.body.scrollWidth > window.innerWidth
  );
  if (hasOverflow) throw new Error(`${route.name} tiene overflow horizontal`);
}

await browser.close();
