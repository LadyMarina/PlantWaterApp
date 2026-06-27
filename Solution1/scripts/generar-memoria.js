/**
 * Genera la memoria actualizada de la Actividad 2 en formato .docx,
 * alineada con el código REAL de PlantCare y con los resultados de
 * ejecución reales (logs y capturas de la carpeta evidencias/).
 *
 * Uso:  node scripts/generar-memoria.js
 * Salida: Act2-IA-actualizada.docx
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, ShadingType,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const EVID = path.join(ROOT, "evidencias");
const GREEN = "2E7D32";
const CODE_BG = "F4F4F4";

/* ----------------------- helpers ----------------------- */
const H1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, color: GREEN, bold: true })],
  });

const H2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, color: GREEN, bold: true })],
  });

const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, ...opts })],
  });

const Bullet = (text) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text })],
  });

const PromptBox = (text) =>
  new Paragraph({
    spacing: { before: 80, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "EAF3EA" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: GREEN, space: 8 },
    },
    children: [new TextRun({ text, italics: true })],
  });

// Bloque de código: una línea por párrafo, monoespaciado y con fondo.
const Code = (code) =>
  code.replace(/\t/g, "  ").split("\n").map(
    (line) =>
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.CLEAR, fill: CODE_BG },
        children: [new TextRun({ text: line || " ", font: "Consolas", size: 16 })],
      })
  );

// Lee ancho/alto de un PNG desde su cabecera IHDR.
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function Img(fileName, maxW = 580) {
  const data = fs.readFileSync(path.join(EVID, fileName));
  const { w, h } = pngSize(data);
  const width = Math.min(maxW, w);
  const height = Math.round((width * h) / w);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 80 },
    children: [new ImageRun({ data, transformation: { width, height } })],
  });
}

const Caption = (text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({ text, italics: true, size: 18, color: "666666" })],
  });

// Tabla simple a partir de filas (la primera es cabecera).
function makeTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map(
          (c) =>
            new TableCell({
              borders,
              shading: ri === 0 ? { type: ShadingType.CLEAR, fill: "DCEFDC" } : undefined,
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: String(c), bold: ri === 0 })] })],
            })
        ),
      })
    ),
  });
}

/* ----------------------- contenido ----------------------- */
const children = [];

// Portada / cabecera
children.push(
  makeTable([
    ["Asignatura", "Datos del alumno", "Fecha"],
    [
      "Generalización de Código de Automatización en Desarrollo de Software con IA",
      "Apellidos: Chavarría González\nNombre: Marina",
      "Junio 2026",
    ],
  ])
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 320, after: 80 },
    children: [new TextRun({ text: "Actividad 2", bold: true, size: 48, color: GREEN })],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: "Generación de entornos de pruebas y casos de test asistidos por IA",
        bold: true, size: 28, color: GREEN,
      }),
    ],
  })
);

// 1. Análisis
children.push(H1("1. Análisis de la aplicación existente"));
children.push(P(
  "PlantCare es una aplicación web 100% cliente que gestiona el riego de plantas " +
  "con Vanilla JS (ES6+) y localStorage, sin dependencias externas ni bundler. " +
  "Toda la lógica vive en app.js, encapsulada en una IIFE con \"use strict\", y la " +
  "interfaz se construye dinámicamente sobre index.html. Para definir el alcance de " +
  "las pruebas se pidió a la IA que identificara las funcionalidades críticas."
));
children.push(P("Prompt utilizado:", { bold: true }));
children.push(PromptBox(
  "Analiza este proyecto web (PlantCare, Vanilla JS + localStorage) e identifica las " +
  "funcionalidades críticas que deben cubrirse con pruebas automatizadas. Para cada " +
  "una, indica el tipo de prueba más adecuado (unitaria, integración o E2E) y su prioridad."
));
children.push(P("Respuesta del asistente (resumen):"));
children.push(makeTable([
  ["Funcionalidad", "Tipo de prueba", "Prioridad"],
  ["Cálculo del estado de riego (computeStatus)", "Unitaria", "Alta"],
  ["Persistencia en localStorage (save/load)", "Unitaria / Integración", "Alta"],
  ["Añadir planta (validación de formulario)", "Integración", "Alta"],
  ["Editar planta existente", "Integración", "Alta"],
  ["Eliminar planta con confirmación", "Integración / E2E", "Alta"],
  ["Regar planta (reinicio de estado)", "Integración / E2E", "Alta"],
  ["Panel de resumen (hero)", "Integración", "Media"],
  ["Barra de progreso de riego", "Unitaria / Integración", "Media"],
  ["Calendario mensual de riego", "Integración / E2E", "Media"],
]));

// 2. Configuración
children.push(H1("2. Configuración del entorno de pruebas"));
children.push(P(
  "Al ser una aplicación Vanilla JS sin módulos, se adoptó una estrategia doble: " +
  "Jest + jsdom para la lógica (unitarias e integración) y Playwright para la " +
  "interfaz (E2E)."
));
children.push(P("Prompt utilizado:", { bold: true }));
children.push(PromptBox(
  "Genera la configuración completa de un entorno de pruebas para una app Vanilla JS " +
  "que usa localStorage y cuyo código está dentro de una IIFE: 1) package.json con " +
  "scripts de test, 2) jest.config.js con jsdom, 3) un setup que limpie localStorage " +
  "antes de cada test, 4) playwright.config.js que sirva la app en localhost:3000."
));
children.push(P("package.json (scripts y dependencias):", { bold: true }));
children.push(...Code(
`"scripts": {
  "test": "jest",
  "test:coverage": "jest --coverage",
  "test:e2e": "playwright test"
},
"devDependencies": {
  "@playwright/test": "^1.48.0",
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^29.7.0",
  "jsdom": "^25.0.0",
  "serve": "^14.2.0"
}`));
children.push(P("jest.config.js:", { bold: true }));
children.push(...Code(
`module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./tests/setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["app.js"],
  coverageReporters: ["text", "html", "lcov"],
};`));
children.push(P("tests/setup.js (limpieza de localStorage):", { bold: true }));
children.push(...Code(
`// jsdom ya ofrece un localStorage real: en lugar de mockearlo,
// garantizamos que esté limpio antes de cada test.
beforeEach(() => {
  try { window.localStorage.clear(); } catch (_) {}
});`));

// 3. Unitarias
children.push(H1("3. Generación de casos de prueba unitarios"));
children.push(P(
  "Las pruebas unitarias cubren la lógica pura de app.js: el cálculo del estado de " +
  "riego (computeStatus) y la persistencia (save/load). Importante: como app.js está " +
  "envuelto en una IIFE, ninguna función es accesible desde fuera. Se pidió a la IA " +
  "una solución que no alterase el comportamiento en el navegador."
));
children.push(P("Prompt utilizado:", { bold: true }));
children.push(PromptBox(
  "El código de app.js está dentro de una IIFE y no exporta nada. Necesito testear " +
  "computeStatus(plant) — que devuelve {level: 'ok'|'soon'|'urgent', percent, daysLeft} — " +
  "y las funciones save()/load() que persisten en la clave 'plantcare.plants'. ¿Cómo " +
  "expongo esas funciones para Jest sin afectar a la ejecución en el navegador?"
));
children.push(P(
  "Solución: añadir al final de la IIFE un bloque module.exports protegido por " +
  "typeof module !== \"undefined\". En el navegador 'module' no existe, por lo que el " +
  "bloque se ignora y la app no cambia; bajo Node/Jest, expone las funciones internas."
));
children.push(...Code(
`if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeStatus, save, load, render, addPlant, updatePlant,
    deletePlant, waterPlant, isoFromDate, todayISO, STORAGE_KEY,
    _setPlants: (arr) => { plants = arr; },
    _getPlants: () => plants,
  };
}`));
children.push(P("Extracto de tests/unit/plantLogic.test.js:", { bold: true }));
children.push(...Code(
`const { computeStatus, save, load, _setPlants, _getPlants } =
  require("../../app.js");

describe("computeStatus", () => {
  test("nivel 'ok' cuando queda mas del 50% del intervalo", () => {
    const plant = { cada: 7, ultimo: isoDaysAgo(1) };
    expect(computeStatus(plant).level).toBe("ok");
  });
  test("nivel 'urgent' cuando se ha superado el intervalo", () => {
    const plant = { cada: 7, ultimo: isoDaysAgo(10) };
    expect(computeStatus(plant).level).toBe("urgent");
  });
  test("caso limite: frecuencia 0 dias -> 'urgent'", () => {
    expect(computeStatus({ cada: 0, ultimo: isoDaysAgo(3) }).level)
      .toBe("urgent");
  });
});

describe("save() / load()", () => {
  test("guarda y recupera el array correctamente", () => {
    const plantas = [{ id: 1, name: "Monstera", tipo: "interior",
      cada: 7, ultimo: "2025-06-01", color: "#4ECDC4" }];
    _setPlants(plantas); save();
    _setPlants([]); load();
    expect(_getPlants()).toEqual(plantas);
  });
});`));

// 4. Integración
children.push(H1("4. Generación de pruebas de integración"));
children.push(P(
  "Las pruebas de integración cargan el <body> real de index.html en el DOM de jsdom " +
  "y después importan app.js con require(), de modo que sus referencias al DOM apuntan " +
  "a elementos reales. Así se verifica, a través de la interfaz, que añadir, editar, " +
  "eliminar y regar plantas actualiza el DOM y localStorage. Este enfoque (require sobre " +
  "un DOM pre-poblado) también permite que la cobertura quede instrumentada."
));
children.push(P("Prompt utilizado:", { bold: true }));
children.push(PromptBox(
  "Genera pruebas de integración con Jest y jsdom que carguen el index.html real y " +
  "comprueben: 1) añadir una planta desde el formulario crea su tarjeta (.card) y la " +
  "persiste; 2) eliminar una planta la quita del DOM y de localStorage; 3) regar una " +
  "planta vencida cambia su badge a 'Al día'; 4) el panel de resumen cuenta bien."
));
children.push(P("Extracto de tests/integration/dom.test.js:", { bold: true }));
children.push(...Code(
`// Inyectamos el <body> real y luego importamos la app.
const bodyHtml = indexHtml.match(/<body[^>]*>([\\s\\S]*)<\\/body>/i)[1]
  .replace('<script src="app.js"></script>', "");
document.body.innerHTML = bodyHtml;
const app = require("../../app.js");
document.dispatchEvent(new window.Event("DOMContentLoaded"));

test("anadir una planta crea su tarjeta y la guarda", () => {
  document.querySelector("#btnAdd").click();
  submitForm({ name: "Cactus", tipo: "suculenta",
              cada: 14, ultimo: "2020-06-10" });
  expect(document.querySelectorAll(".card").length).toBe(1);
  const stored = JSON.parse(localStorage.getItem("plantcare.plants"));
  expect(stored[0].name).toBe("Cactus");
});`));

// 5. E2E
children.push(H1("5. Pruebas de interfaz (E2E con Playwright)"));
children.push(P(
  "Playwright automatiza Chromium real sobre la app servida en localhost:3000. Los " +
  "selectores se alinearon con el HTML real (#btnAdd, #fName, #fTipo, #fCada, #fUltimo, " +
  "#btnSubmit, .card, .badge--ok/--urgent, #calLabel), ya que el HTML no usa atributos " +
  "data-testid."
));
children.push(P("Prompt utilizado:", { bold: true }));
children.push(PromptBox(
  "Genera pruebas E2E con Playwright para PlantCare que cubran: 1) añadir una planta por " +
  "el formulario y verla en la lista; 2) regar una planta vencida y comprobar que su " +
  "estado pasa a 'Al día'; 3) editar una planta; 4) ver el calendario con el mes actual. " +
  "Usa los selectores reales del index.html (ids #fName, #fTipo... y clases .card)."
));
children.push(P("Extracto de tests/e2e/plantcare.spec.js:", { bold: true }));
children.push(...Code(
`test("anadir una planta aparece en la lista", async ({ page }) => {
  await page.click("#btnAdd");
  await page.fill("#fName", "Orquidea");
  await page.selectOption("#fTipo", "interior");
  await page.fill("#fCada", "5");
  await page.fill("#fUltimo", "2025-06-15");
  await page.click("#btnSubmit");
  await expect(page.locator(".card__name")).toHaveText("Orquidea");
});

test("regar una planta vencida la deja 'Al dia'", async ({ page }) => {
  // ...se siembra una planta vencida en localStorage...
  await expect(page.locator(".badge--urgent")).toBeVisible();
  await page.click('button[data-action="water"]');
  await expect(page.locator(".badge--ok")).toBeVisible();
});`));

// 6. Ejecución
children.push(H1("6. Ejecución y verificación de resultados"));
children.push(H2("6.1 Pruebas unitarias e integración (Jest)"));
children.push(P("Comando ejecutado:", { bold: true }));
children.push(...Code("npm run test:coverage"));
children.push(P("Resultado obtenido (19 pruebas, 2 suites):"));
children.push(Img("05-informe-cobertura.png", 580));
children.push(Caption("Figura 1. Informe HTML de cobertura generado por Jest (Istanbul)."));
children.push(...Code(
`PASS tests/integration/dom.test.js  (9 tests)
PASS tests/unit/plantLogic.test.js  (10 tests)

Test Suites: 2 passed, 2 total
Tests:       19 passed, 19 total
Coverage: 80.54% stmts | 58.06% branches | 84.48% funcs | 83.84% lines`));

children.push(H2("6.2 Corrección de fallos con ayuda de la IA"));
children.push(P(
  "Durante la puesta en marcha aparecieron tres incidencias reales que se resolvieron " +
  "iterando con el asistente:"
));
children.push(P("a) Funciones inaccesibles por la IIFE.", { bold: true }));
children.push(P(
  "Los tests unitarios no podían importar computeStatus ni save/load. Solución: bloque " +
  "module.exports protegido (sección 3), sin efecto en el navegador."
));
children.push(P("b) 'TextEncoder is not defined' al requerir jsdom.", { bold: true }));
children.push(PromptBox(
  "El test de integración falla con 'ReferenceError: TextEncoder is not defined' al hacer " +
  "require('jsdom') dentro del entorno jsdom de Jest. ¿Cómo lo soluciono?"
));
children.push(P(
  "La IA propuso prescindir del paquete jsdom externo en ese archivo y trabajar sobre el " +
  "DOM global que ya ofrece el entorno jsdom de Jest: se inyecta el <body> real en " +
  "document y se importa app.js con require(). Esto elimina la dependencia de TextEncoder " +
  "y, además, permite medir la cobertura."
));
children.push(P("c) Selectores data-testid inexistentes.", { bold: true }));
children.push(P(
  "Los primeros tests E2E usaban selectores data-testid genéricos que no existen en el " +
  "HTML. Se adaptaron a los identificadores y clases reales (#fName, .card, .badge--ok…)."
));

children.push(H2("6.3 Pruebas E2E (Playwright)"));
children.push(P("Comando ejecutado:", { bold: true }));
children.push(...Code("npx playwright test"));
children.push(P("Resultado obtenido:"));
children.push(...Code(
`Running 4 tests using 4 workers
  ok  PlantCare E2E > anadir una planta aparece en la lista
  ok  PlantCare E2E > regar una planta vencida la deja 'Al dia'
  ok  PlantCare E2E > editar una planta refleja el cambio en la tarjeta
  ok  PlantCare E2E > el calendario muestra el mes actual
  4 passed (2.9s)`));
children.push(Img("06-informe-playwright.png", 580));
children.push(Caption("Figura 2. Informe HTML de Playwright: 4 pruebas E2E superadas."));

// 7. Cobertura
children.push(H1("7. Cobertura de pruebas"));
children.push(makeTable([
  ["Métrica", "Cubierto", "Porcentaje"],
  ["Sentencias (statements)", "294 / 365", "80.54%"],
  ["Ramas (branches)", "72 / 124", "58.06%"],
  ["Funciones (functions)", "49 / 58", "84.48%"],
  ["Líneas (lines)", "275 / 328", "83.84%"],
]));
children.push(P(
  "La cobertura de sentencias (80.5%) y líneas (83.8%) supera con holgura el umbral " +
  "recomendado del 70%. Las zonas menos cubiertas corresponden a ramas de manejo de " +
  "errores de localStorage (try/catch), al popover del calendario y a la navegación por " +
  "teclado dentro del modal, difíciles de reproducir de forma automatizada."
));

// 8. Capturas de la app
children.push(H1("8. Evidencias de la aplicación en ejecución"));
children.push(P(
  "Capturas tomadas automáticamente con el Chromium de Playwright (script " +
  "scripts/capturas.js) que muestran la app funcionando con datos de prueba."
));
children.push(Img("02-app-con-plantas.png", 460));
children.push(Caption("Figura 3. Lista de plantas con los tres estados de riego (Al día, Regar pronto, Regar ya) y calendario mensual."));
children.push(Img("03-modal-anadir-planta.png", 460));
children.push(Caption("Figura 4. Formulario modal de alta/edición de planta."));

// 9. Estructura
children.push(H1("9. Estructura del repositorio y entregables"));
children.push(...Code(
`PlantWaterApp/
|-- index.html
|-- styles.css
|-- app.js                 # + bloque module.exports solo para Node/Jest
|-- package.json
|-- jest.config.js
|-- playwright.config.js
|-- requirements.txt
|-- README.md
|-- scripts/
|   |-- capturas.js        # genera las capturas de evidencias
|   '-- generar-memoria.js
|-- evidencias/            # logs y capturas de ejecucion
'-- tests/
    |-- setup.js
    |-- unit/plantLogic.test.js
    |-- integration/dom.test.js
    '-- e2e/plantcare.spec.js`));
children.push(P("Instrucciones de ejecución (README.md):", { bold: true }));
children.push(...Code(
`npm install
npx playwright install chromium
npm run test:coverage     # unitarias + integracion (con cobertura)
npm run test:e2e          # pruebas E2E`));

// 10. Conclusiones
children.push(H1("10. Análisis de resultados y conclusiones"));
children.push(H2("10.1 Valoración del proceso asistido por IA"));
children.push(P(
  "El asistente fue muy eficaz para montar el andamiaje (configuración de Jest y " +
  "Playwright, mocks/limpieza de localStorage) y para proponer casos límite (frecuencia " +
  "0, fechas futuras). Pero el aporte más valioso fue diagnóstico: identificar que la " +
  "IIFE impedía importar funciones y resolver el error de TextEncoder cambiando de " +
  "estrategia de carga del DOM."
));
children.push(H2("10.2 Limitaciones encontradas"));
children.push(Bullet(
  "El asistente asumió inicialmente nombres de función genéricos (calcularEstado, " +
  "guardarPlantas) que no coincidían con los reales (computeStatus, save/load); fue " +
  "necesario proporcionarle el código real para ajustarlos."
));
children.push(Bullet(
  "Los valores de estado propuestos ('ok'/'pronto'/'ya') diferían de los reales " +
  "('ok'/'soon'/'urgent'); se corrigieron tras revisar app.js."
));
children.push(Bullet(
  "Los selectores E2E iniciales con data-testid no existían en el HTML real y hubo que " +
  "adaptarlos a los identificadores reales."
));
children.push(H2("10.3 Conclusión general"));
children.push(P(
  "La combinación Jest + jsdom (lógica e integración) y Playwright (E2E) resultó robusta " +
  "para una app Vanilla JS. Se obtuvieron 23 pruebas verdes (19 Jest + 4 E2E) y una " +
  "cobertura del 80.5% en sentencias. La clave fue iterar con la IA aportándole el código " +
  "real: cuanto más preciso y contextualizado el prompt, más útil y reutilizable la " +
  "respuesta. La IA acelera el testing, pero la verificación humana frente al código real " +
  "sigue siendo imprescindible."
));

/* ----------------------- documento ----------------------- */
const doc = new Document({
  creator: "Marina Chavarría González",
  title: "Actividad 2 - Pruebas asistidas por IA (PlantCare)",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
  sections: [{ properties: {}, children }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "Act2-IA-actualizada.docx");
  fs.writeFileSync(out, buf);
  console.log("Memoria generada:", out, "(" + buf.length + " bytes)");
});
