/**
 * Pruebas UNITARIAS de la lógica pura de PlantCare (app.js).
 *
 * Cubren:
 *   - computeStatus(plant): cálculo del estado de riego (ok / soon / urgent),
 *     porcentaje de progreso y días restantes.
 *   - save() / load(): persistencia del array de plantas en localStorage.
 *   - isoFromDate() / todayISO(): utilidades de fecha.
 *
 * Nota: las funciones se importan gracias al bloque de exports añadido al
 * final de app.js (solo activo bajo Node/Jest, sin efecto en el navegador).
 */
const {
  computeStatus,
  save,
  load,
  isoFromDate,
  todayISO,
  STORAGE_KEY,
  _setPlants,
  _getPlants,
} = require("../../app.js");

/** Devuelve la fecha de hace `n` días en formato YYYY-MM-DD (zona local). */
function isoDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return isoFromDate(d);
}

describe("computeStatus — cálculo del estado de riego", () => {
  test("nivel 'ok' cuando queda más del 50% del intervalo", () => {
    // cada 7 días, regada hace 1 día -> quedan 6 (86% restante)
    const plant = { cada: 7, ultimo: isoDaysAgo(1) };
    const status = computeStatus(plant);
    expect(status.level).toBe("ok");
    expect(status.label).toBe("Al día");
  });

  test("nivel 'soon' cuando queda menos del 50% pero aún no vence", () => {
    // cada 7 días, regada hace 5 días -> quedan 2 (28% restante)
    const plant = { cada: 7, ultimo: isoDaysAgo(5) };
    const status = computeStatus(plant);
    expect(status.level).toBe("soon");
    expect(status.label).toBe("Regar pronto");
  });

  test("nivel 'urgent' cuando se ha superado el intervalo", () => {
    // cada 7 días, regada hace 10 días -> vencida
    const plant = { cada: 7, ultimo: isoDaysAgo(10) };
    const status = computeStatus(plant);
    expect(status.level).toBe("urgent");
    expect(status.label).toBe("Regar ya");
  });

  test("el porcentaje de progreso se mantiene entre 0 y 100", () => {
    const reciente = computeStatus({ cada: 10, ultimo: isoDaysAgo(0) });
    const vencida = computeStatus({ cada: 10, ultimo: isoDaysAgo(50) });
    expect(reciente.percent).toBeGreaterThanOrEqual(0);
    expect(reciente.percent).toBeLessThanOrEqual(100);
    expect(vencida.percent).toBe(100); // topa en 100 aunque esté muy vencida
  });

  test("caso límite: frecuencia de 0 días se considera 'urgent'", () => {
    const status = computeStatus({ cada: 0, ultimo: isoDaysAgo(3) });
    expect(status.level).toBe("urgent");
  });
});

describe("save() / load() — persistencia en localStorage", () => {
  test("guarda y recupera el array de plantas correctamente", () => {
    const plantas = [
      { id: 1, name: "Monstera", tipo: "interior", cada: 7, ultimo: "2025-06-01", color: "#4ECDC4" },
    ];
    _setPlants(plantas);
    save();

    // Vaciamos el estado en memoria y lo recargamos desde localStorage
    _setPlants([]);
    load();
    expect(_getPlants()).toEqual(plantas);
  });

  test("escribe en la clave correcta de localStorage", () => {
    _setPlants([{ id: 9, name: "Cactus", tipo: "suculenta", cada: 14, ultimo: "2025-06-10", color: "#F7DC6F" }]);
    save();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw)[0].name).toBe("Cactus");
  });

  test("load() devuelve un array vacío si localStorage está vacío", () => {
    _setPlants([{ id: 1, name: "X", tipo: "otro", cada: 3, ultimo: "2025-06-01", color: "#FF6B6B" }]);
    load(); // localStorage está limpio (lo limpia el setup antes de cada test)
    expect(_getPlants()).toEqual([]);
  });
});

describe("Utilidades de fecha", () => {
  test("isoFromDate devuelve formato YYYY-MM-DD", () => {
    expect(isoFromDate(new Date("2025-06-15T10:30:00"))).toBe("2025-06-15");
  });

  test("todayISO devuelve la fecha de hoy en formato ISO corto", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
