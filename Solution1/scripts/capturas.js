/**
 * Genera capturas de pantalla (evidencias) de PlantCare y de los informes
 * de pruebas usando el Chromium de Playwright.
 *
 * Uso:  node scripts/capturas.js
 * Salida: carpeta evidencias/*.png
 */
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const EVID = path.join(ROOT, "evidencias");
const fileUrl = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

// Fechas relativas a hoy para mostrar los tres estados de riego.
function isoDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const PLANTAS_DEMO = [
  { id: 1, name: "Monstera", tipo: "interior", cada: 7, ultimo: isoDaysAgo(1), color: "#4ECDC4" },
  { id: 2, name: "Cactus", tipo: "suculenta", cada: 14, ultimo: isoDaysAgo(10), color: "#F7DC6F" },
  { id: 3, name: "Albahaca", tipo: "huerto", cada: 3, ultimo: isoDaysAgo(6), color: "#FF6B6B" },
  { id: 4, name: "Ficus", tipo: "interior", cada: 5, ultimo: isoDaysAgo(2), color: "#BB8FCE" },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // ---- 1. App con el estado vacío ----
  await page.goto(fileUrl("index.html"));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#emptyState");
  await page.screenshot({ path: path.join(EVID, "01-app-estado-vacio.png"), fullPage: true });

  // ---- 2. App con varias plantas (los tres estados de riego) ----
  await page.evaluate((plantas) => {
    localStorage.setItem("plantcare.plants", JSON.stringify(plantas));
  }, PLANTAS_DEMO);
  await page.reload();
  await page.waitForSelector(".card");
  await page.screenshot({ path: path.join(EVID, "02-app-con-plantas.png"), fullPage: true });

  // ---- 3. Modal de añadir planta ----
  await page.click("#btnAdd");
  await page.waitForSelector("#modalOverlay:not([hidden])");
  await page.screenshot({ path: path.join(EVID, "03-modal-anadir-planta.png") });
  await page.click("#btnCancel");

  // ---- 4. Calendario de riego ----
  const cal = page.locator(".calendar-section");
  await cal.scrollIntoViewIfNeeded();
  await cal.screenshot({ path: path.join(EVID, "04-calendario-riego.png") });

  // ---- 5. Informe de cobertura (Jest) ----
  await page.goto(fileUrl("coverage/index.html"));
  await page.waitForLoadState("load");
  await page.screenshot({ path: path.join(EVID, "05-informe-cobertura.png"), fullPage: true });

  // ---- 6. Informe E2E (Playwright) ----
  await page.goto(fileUrl("playwright-report/index.html"));
  await page.waitForLoadState("load");
  await page.waitForTimeout(800); // deja que cargue el JSON embebido
  await page.screenshot({ path: path.join(EVID, "06-informe-playwright.png"), fullPage: true });

  await browser.close();
  console.log("Capturas generadas en", EVID);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
