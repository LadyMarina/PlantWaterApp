/**
 * Setup global de Jest (se ejecuta antes de cada archivo de test).
 *
 * jsdom ya proporciona un localStorage funcional, así que en lugar de
 * sustituirlo por un mock externo (que podría desincronizarse del real)
 * simplemente garantizamos que esté limpio antes de cada test.
 *
 * Si por algún motivo el entorno no tuviera localStorage, definimos un
 * mock mínimo en memoria como salvaguarda.
 */
if (typeof window !== "undefined" && !("localStorage" in window)) {
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
}

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch (_) {
    /* sin localStorage disponible: nada que limpiar */
  }
});
