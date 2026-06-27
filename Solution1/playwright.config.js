// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Configuración de Playwright para las pruebas E2E de PlantCare.
 * Levanta un servidor estático local (serve) en el puerto 3000 y ejecuta
 * los tests contra Chromium.
 */
module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx serve -l 3000 .",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
