// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * Pruebas E2E de PlantCare con Playwright (navegador real, Chromium).
 *
 * Cubren el flujo completo de usuario:
 *   1. Añadir una planta desde el formulario y verla en la lista.
 *   2. Regar una planta vencida y comprobar que su estado pasa a "Al día".
 *   3. Editar una planta y comprobar que el cambio se refleja.
 *   4. Ver el calendario de riego con el mes actual.
 *
 * Selectores alineados con el HTML real (index.html): #btnAdd, #fName,
 * #fTipo, #fCada, #fUltimo, #btnSubmit, .card, .badge--*, #calLabel.
 */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

test.describe("PlantCare E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("añadir una planta aparece en la lista", async ({ page }) => {
    await page.click("#btnAdd");
    await page.fill("#fName", "Orquídea");
    await page.selectOption("#fTipo", "interior");
    await page.fill("#fCada", "5");
    await page.fill("#fUltimo", "2025-06-15");
    await page.click("#btnSubmit");

    await expect(page.locator(".card__name")).toHaveText("Orquídea");
    await expect(page.locator(".card")).toHaveCount(1);
  });

  test("regar una planta vencida la deja 'Al día'", async ({ page }) => {
    // Sembramos una planta vencida directamente en localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        "plantcare.plants",
        JSON.stringify([
          { id: 1, name: "Rosa", tipo: "exterior", cada: 3, ultimo: "2020-06-01", color: "#FF6B6B" },
        ])
      );
    });
    await page.reload();

    await expect(page.locator(".badge--urgent")).toBeVisible();
    await page.click('button[data-action="water"]');
    await expect(page.locator(".badge--ok")).toBeVisible();
  });

  test("editar una planta refleja el cambio en la tarjeta", async ({ page }) => {
    await page.click("#btnAdd");
    await page.fill("#fName", "Aloe");
    await page.selectOption("#fTipo", "suculenta");
    await page.fill("#fCada", "10");
    await page.fill("#fUltimo", "2025-06-01");
    await page.click("#btnSubmit");

    await page.click('button[data-action="edit"]');
    await page.fill("#fName", "Aloe Vera");
    await page.click("#btnSubmit");

    await expect(page.locator(".card__name")).toHaveText("Aloe Vera");
  });

  test("el calendario muestra el mes actual", async ({ page }) => {
    const ahora = new Date();
    const etiqueta = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;
    await expect(page.locator("#calLabel")).toHaveText(etiqueta);
  });
});
