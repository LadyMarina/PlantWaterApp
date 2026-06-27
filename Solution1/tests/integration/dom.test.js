/**
 * Pruebas de INTEGRACIÓN de PlantCare.
 *
 * Cargan el cuerpo del index.html REAL en el DOM simulado de Jest (jsdom) y
 * después importan app.js con require(), de modo que sus referencias al DOM
 * apuntan a los elementos reales y la cobertura queda instrumentada.
 *
 * Verifican la interacción entre lógica, DOM y localStorage:
 *   1. Añadir una planta crea su tarjeta y la persiste.
 *   2. La validación del formulario rechaza datos inválidos.
 *   3. Eliminar una planta quita la tarjeta y actualiza localStorage.
 *   4. Editar una planta refleja los cambios en la tarjeta.
 *   5. Regar una planta vencida reinicia su estado a "Al día".
 *   6. El panel de resumen (hero) muestra los contadores correctos.
 *   7. El calendario navega entre meses y marca los días de riego.
 */
const fs = require("fs");
const path = require("path");

const STORAGE_KEY = "plantcare.plants";

// 1) Inyectamos el <body> real del index.html en el documento de jsdom,
//    quitando la etiqueta <script src="app.js"> (lo cargaremos vía require).
const indexHtml = fs.readFileSync(
  path.resolve(__dirname, "../../index.html"),
  "utf-8"
);
const bodyHtml = indexHtml
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace('<script src="app.js"></script>', "");
document.body.innerHTML = bodyHtml;

// 2) Importamos la app: la IIFE captura las referencias al DOM ya presentes.
const app = require("../../app.js");

// 3) Disparamos DOMContentLoaded para ejecutar init() (bindEvents + render).
document.dispatchEvent(new window.Event("DOMContentLoaded"));

/** Rellena el formulario del modal y lo envía para crear/editar una planta. */
function submitForm({ name, tipo, cada, ultimo }) {
  if (name !== undefined) document.querySelector("#fName").value = name;
  if (tipo !== undefined) document.querySelector("#fTipo").value = tipo;
  if (cada !== undefined) document.querySelector("#fCada").value = String(cada);
  if (ultimo !== undefined) document.querySelector("#fUltimo").value = ultimo;
  document
    .querySelector("#plantForm")
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  // Estado limpio antes de cada test (los eventos ya están enlazados por init).
  window.localStorage.clear();
  window.confirm = () => true; // deletePlant pide confirmación
  app._setPlants([]);
  app.render();
});

describe("Integración — gestión de plantas sobre el DOM real", () => {
  test("arranca sin tarjetas y con el estado vacío visible", () => {
    expect(document.querySelectorAll(".card").length).toBe(0);
    expect(document.querySelector("#emptyState").hidden).toBe(false);
    expect(document.querySelector("#statTotal").textContent).toBe("0");
  });

  test("añadir una planta crea su tarjeta y la guarda en localStorage", () => {
    document.querySelector("#btnAdd").click(); // abre el modal
    submitForm({ name: "Cactus", tipo: "suculenta", cada: 14, ultimo: "2020-06-10" });

    const cards = document.querySelectorAll(".card");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Cactus");

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Cactus");
    expect(document.querySelector("#emptyState").hidden).toBe(true);
  });

  test("el formulario rechaza un nombre vacío y muestra error", () => {
    document.querySelector("#btnAdd").click();
    submitForm({ name: "", tipo: "interior", cada: 7, ultimo: "2020-06-01" });

    expect(document.querySelector("#formError").hidden).toBe(false);
    expect(document.querySelectorAll(".card").length).toBe(0);
  });

  test("el formulario rechaza una fecha de último riego futura", () => {
    document.querySelector("#btnAdd").click();
    submitForm({ name: "Futura", tipo: "interior", cada: 7, ultimo: "2999-01-01" });

    expect(document.querySelector("#formError").hidden).toBe(false);
    expect(document.querySelectorAll(".card").length).toBe(0);
  });

  test("eliminar una planta quita su tarjeta y actualiza localStorage", () => {
    document.querySelector("#btnAdd").click();
    submitForm({ name: "Ficus", tipo: "interior", cada: 7, ultimo: "2020-06-01" });
    expect(document.querySelectorAll(".card").length).toBe(1);

    document.querySelector('button[data-action="delete"]').click();

    expect(document.querySelectorAll(".card").length).toBe(0);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([]);
  });

  test("editar una planta refleja el nuevo nombre en la tarjeta", () => {
    document.querySelector("#btnAdd").click();
    submitForm({ name: "Aloe", tipo: "suculenta", cada: 10, ultimo: "2020-06-01" });

    document.querySelector('button[data-action="edit"]').click(); // modo edición
    submitForm({ name: "Aloe Vera", tipo: "suculenta", cada: 10, ultimo: "2020-06-01" });

    const cards = document.querySelectorAll(".card");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Aloe Vera");
  });

  test("regar una planta vencida reinicia su estado a 'Al día'", () => {
    document.querySelector("#btnAdd").click();
    submitForm({ name: "Rosa", tipo: "exterior", cada: 3, ultimo: "2020-01-01" });
    expect(document.querySelector(".badge--urgent")).not.toBeNull();

    document.querySelector('button[data-action="water"]').click();

    expect(document.querySelector(".badge--ok")).not.toBeNull();
    expect(document.querySelector(".badge--urgent")).toBeNull();
  });

  test("el panel de resumen cuenta el total de plantas", () => {
    document.querySelector("#btnAdd").click();
    submitForm({ name: "Una", tipo: "interior", cada: 2, ultimo: "2020-01-01" });
    document.querySelector("#btnAdd").click();
    submitForm({ name: "Dos", tipo: "interior", cada: 30, ultimo: "2020-01-01" });

    expect(document.querySelector("#statTotal").textContent).toBe("2");
    expect(Number(document.querySelector("#statToday").textContent)).toBeGreaterThanOrEqual(1);
  });

  test("el calendario navega entre meses y marca días de riego", () => {
    // Planta con riego frecuente -> generará días marcados en el calendario
    app._setPlants([
      { id: 1, name: "Helecho", tipo: "interior", cada: 2, ultimo: "2020-01-01", color: "#4ECDC4" },
    ]);
    app.render();

    const etiquetaInicial = document.querySelector("#calLabel").textContent;
    expect(etiquetaInicial).not.toBe("");

    document.querySelector("#calNext").click(); // mes siguiente
    expect(document.querySelector("#calLabel").textContent).not.toBe(etiquetaInicial);

    document.querySelector("#calPrev").click(); // volvemos
    expect(document.querySelector("#calLabel").textContent).toBe(etiquetaInicial);

    // Debe haber al menos un día marcado como "con riego"
    expect(document.querySelectorAll(".cal-cell--has").length).toBeGreaterThan(0);
  });
});
