/**
 * Configuración de Jest para PlantCare.
 * - testEnvironment "jsdom": simula el navegador (document, window, localStorage).
 * - setupFilesAfterEnv: hook que limpia localStorage antes de cada test.
 * - collectCoverageFrom: medimos cobertura sobre la lógica de la app (app.js).
 */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./tests/setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["app.js"],
  coverageReporters: ["text", "html", "lcov"],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
};
