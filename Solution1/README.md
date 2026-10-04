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
├── manifest.json          # PWA: metadatos de instalación
├── sw.js                  # PWA: service worker (offline, cache-first)
├── icon.svg               # Fuente de diseño del icono
├── generate-icons.html    # Generador de PNG (canvas) para la carpeta icons/
├── icons/                 # apple-touch-icon.png, icon-192/512, 512-maskable
├── package.json
├── jest.config.js
├── playwright.config.js
├── requirements.txt
├── README.md
├── scripts/
│   └── generate-icons.js  # Generador de iconos por línea de comandos (Node)
└── tests/
    ├── setup.js           # limpia localStorage antes de cada test
    ├── unit/
    │   └── plantLogic.test.js
    ├── integration/
    │   └── dom.test.js
    └── e2e/
        └── plantcare.spec.js
```

## PWA — instalable y offline

PlantCare es una **Progressive Web App**: se puede instalar en el iPhone
desde Safari ("Añadir a pantalla de inicio") y funciona sin conexión tras
la primera carga.

- `manifest.json` — nombre, colores, modo `standalone` e iconos. Usa rutas
  relativas (`./`) para funcionar en GitHub Pages bajo un subdirectorio.
- `sw.js` — service worker con estrategia *cache-first*. Para forzar una
  actualización en dispositivos ya instalados, incrementa `CACHE_VERSION`.
- Iconos: edita `icon.svg` y regenera los PNG abriendo `generate-icons.html`
  en el navegador (botón "Descargar todos") o con `node scripts/generate-icons.js`.
  Guarda los PNG en `icons/`.
- Exportar al calendario: el botón "📅 Exportar al calendario" descarga un
  `.ics` con los riegos de los próximos 30 días (evento de día completo y
  alarma a las 9:00).

### Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub.
2. **Settings → Pages** → *Source*: rama `main`, carpeta `/root` → *Save*.
3. Abre la URL `https://<usuario>.github.io/<repo>/` (requiere HTTPS, que
   GitHub Pages ya ofrece, imprescindible para el service worker).

### Instalar en el iPhone

1. Abre esa URL en **Safari** (no sirve Chrome en iOS para instalar).
2. Toca **Compartir** → **Añadir a pantalla de inicio** → **Añadir**.
3. Ábrela desde el icono: arranca a pantalla completa y funciona offline.

## Nota sobre `app.js`

Al final de `app.js` se añadió un bloque `module.exports` protegido por
`typeof module !== "undefined"`. Solo se evalúa bajo Node/Jest; en el
navegador `module` no existe, por lo que **el comportamiento de la app no
cambia**. Permite importar las funciones internas en las pruebas unitarias.
```
