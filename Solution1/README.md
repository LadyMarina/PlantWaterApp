# Entorno de pruebas — PlantCare

Pruebas automatizadas de la aplicación **PlantCare** (gestor de riego de
plantas, Vanilla JS + localStorage). El entorno combina dos estrategias:

- **Jest + jsdom** → pruebas unitarias y de integración de la lógica de `app.js`.
- **Playwright** → pruebas E2E sobre un navegador real (Chromium).

## Requisitos

- Node.js >= 18
- npm >= 9

## Instalación

```bash
npm install
npx playwright install chromium   # navegador para las pruebas E2E
```

## Pruebas unitarias e integración (Jest)

```bash
npm test                 # ejecuta todas las pruebas Jest
npm run test:coverage    # con informe de cobertura
```

- **Unitarias** (`tests/unit/plantLogic.test.js`): cálculo del estado de
  riego (`computeStatus`), porcentaje de progreso, persistencia
  (`save`/`load`) y utilidades de fecha.
- **Integración** (`tests/integration/dom.test.js`): carga el `index.html`
  real en jsdom y verifica añadir, editar, eliminar y regar plantas, la
  persistencia en `localStorage` y el panel de resumen.

## Pruebas E2E (Playwright)

```bash
npm run test:e2e            # levanta el servidor y ejecuta los tests
npm run test:e2e:report     # abre el informe HTML
```

Playwright arranca automáticamente un servidor estático en
`http://localhost:3000` (mediante `serve`) antes de ejecutar los tests.

## Estructura

```
PlantWaterApp/
├── index.html
├── styles.css
├── app.js                 # incluye un bloque de exports solo para Node/Jest
├── package.json
├── jest.config.js
├── playwright.config.js
├── requirements.txt
├── README.md
└── tests/
    ├── setup.js           # limpia localStorage antes de cada test
    ├── unit/
    │   └── plantLogic.test.js
    ├── integration/
    │   └── dom.test.js
    └── e2e/
        └── plantcare.spec.js
```

## Nota sobre `app.js`

Al final de `app.js` se añadió un bloque `module.exports` protegido por
`typeof module !== "undefined"`. Solo se evalúa bajo Node/Jest; en el
navegador `module` no existe, por lo que **el comportamiento de la app no
cambia**. Permite importar las funciones internas en las pruebas unitarias.
```
