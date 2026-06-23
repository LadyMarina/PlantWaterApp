/* ====================================================================
   PlantCare — Lógica de la aplicación (Vanilla JS, ES6+)
   Sin dependencias externas. Persistencia con localStorage.
   ==================================================================== */

(function () {
  "use strict";

  /* ---------------- Constantes y estado ---------------- */
  const STORAGE_KEY = "plantcare.plants";
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Icono representativo según el tipo de planta
  const TYPE_ICON = {
    interior: "🪴",
    exterior: "🌳",
    suculenta: "🌵",
    huerto: "🍅",
    otro: "🌱",
  };

  // Nombres en español para el calendario
  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]; // semana empieza en lunes

  // Paleta de colores identificativos: distintos y agradables. Se reparten sin repetir.
  const PALETTE = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#F0B27A",
  ];

  /** @type {Array<{id:number,name:string,tipo:string,cada:number,ultimo:string}>} */
  let plants = [];

  // Primer día del mes que muestra el calendario (a medianoche)
  let calDate = null;

  /* ---------------- Referencias al DOM ---------------- */
  const $ = (sel) => document.querySelector(sel);

  const plantList = $("#plantList");
  const emptyState = $("#emptyState");
  const statTotal = $("#statTotal");
  const statToday = $("#statToday");
  const statOk = $("#statOk");

  // Calendario
  const calGrid = $("#calGrid");
  const calLabel = $("#calLabel");
  const calPrev = $("#calPrev");
  const calNext = $("#calNext");

  const modalOverlay = $("#modalOverlay");
  const modalTitle = $("#modalTitle");
  const btnSubmit = $("#btnSubmit");
  const form = $("#plantForm");
  const formError = $("#formError");
  const fName = $("#fName");
  const fTipo = $("#fTipo");
  const fCada = $("#fCada");
  const fUltimo = $("#fUltimo");
  const fColor = $("#fColor");
  const swatches = $("#swatches");

  let lastFocused = null; // para devolver el foco al cerrar el modal
  let editingId = null;   // id de la planta en edición, o null si es alta nueva

  /* ====================================================================
     PERSISTENCIA
     ==================================================================== */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      plants = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(plants)) plants = [];
    } catch (err) {
      console.error("No se pudo leer localStorage:", err);
      plants = [];
    }

    // Compatibilidad: asigna color a plantas guardadas antes de existir el campo
    let changed = false;
    plants.forEach((p) => {
      if (!p.color) {
        p.color = nextAvailableColor();
        changed = true;
      }
    });
    if (changed) save();
  }

  /**
   * Devuelve el primer color de la paleta que ninguna planta esté usando.
   * Si ya están todos en uso, cicla por la paleta según el número de plantas.
   */
  function nextAvailableColor() {
    const used = new Set(plants.map((p) => (p.color || "").toUpperCase()));
    const free = PALETTE.find((c) => !used.has(c.toUpperCase()));
    return free || PALETTE[plants.length % PALETTE.length];
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
    } catch (err) {
      console.error("No se pudo guardar en localStorage:", err);
    }
  }

  /* ====================================================================
     CÁLCULO DE ESTADO DE RIEGO
     ==================================================================== */

  /** Devuelve la fecha de hoy a medianoche (para comparar solo días). */
  function todayMidnight() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Calcula el estado de riego de una planta.
   * @returns {{daysSince:number, daysLeft:number, percent:number, level:string, label:string}}
   *   level: "ok" | "soon" | "urgent"
   */
  function computeStatus(plant) {
    const last = new Date(plant.ultimo + "T00:00:00");
    const today = todayMidnight();

    // Días transcurridos desde el último riego
    const daysSince = Math.max(0, Math.round((today - last) / MS_PER_DAY));
    const daysLeft = plant.cada - daysSince;

    // Porcentaje de "tiempo consumido" del intervalo (0–100, tope visual)
    const percent = Math.min(100, Math.round((daysSince / plant.cada) * 100));

    // Fracción del intervalo que aún queda
    const fractionLeft = daysLeft / plant.cada;

    let level, label;
    if (daysLeft <= 0 || daysLeft < 1) {
      // Ha superado el intervalo o queda menos de 1 día
      level = "urgent";
      label = "Regar ya";
    } else if (fractionLeft < 0.5) {
      level = "soon";
      label = "Regar pronto";
    } else {
      level = "ok";
      label = "Al día";
    }

    return { daysSince, daysLeft, percent, level, label };
  }

  /* ====================================================================
     RENDERIZADO
     ==================================================================== */
  function render() {
    // Resumen del hero
    let okCount = 0;
    let todayCount = 0;

    plantList.innerHTML = "";

    plants.forEach((plant) => {
      const status = computeStatus(plant);
      if (status.level === "ok") okCount++;
      if (status.level === "urgent") todayCount++;

      plantList.appendChild(buildCard(plant, status));
    });

    statTotal.textContent = plants.length;
    statToday.textContent = todayCount;
    statOk.textContent = okCount;

    emptyState.hidden = plants.length > 0;

    // Mantener el calendario sincronizado con los cambios
    renderCalendar();
  }

  /** Construye la tarjeta DOM de una planta. */
  function buildCard(plant, status) {
    const card = document.createElement("article");
    card.className = "card";

    const icon = TYPE_ICON[plant.tipo] || TYPE_ICON.otro;

    // Texto descriptivo del tiempo restante
    let metaText;
    if (status.daysLeft <= 0) {
      const overdue = Math.abs(status.daysLeft);
      metaText =
        overdue === 0
          ? "Toca regar hoy"
          : `Atrasada ${overdue} día${overdue === 1 ? "" : "s"}`;
    } else {
      metaText = `Riego en ${status.daysLeft} día${status.daysLeft === 1 ? "" : "s"}`;
    }

    card.innerHTML = `
      <div class="card__icon" style="background:${plant.color}" aria-hidden="true">${icon}</div>
      <div class="card__body">
        <div class="card__head">
          <span class="card__name">${escapeHtml(plant.name)}</span>
          <span class="badge badge--${status.level}">${status.label}</span>
        </div>
        <p class="card__meta">${capitalize(plant.tipo)} · cada ${plant.cada} días · ${metaText}</p>
        <div class="progress" role="progressbar"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${status.percent}"
             aria-label="Progreso de riego de ${escapeHtml(plant.name)}">
          <div class="progress__bar progress__bar--${status.level}" style="width:${status.percent}%"></div>
        </div>
        <div class="card__actions">
          <button class="btn btn--sm btn--water" data-action="water" data-id="${plant.id}">
            💧 Regar
          </button>
          <button class="btn btn--sm btn--edit" data-action="edit" data-id="${plant.id}"
                  aria-label="Editar ${escapeHtml(plant.name)}" title="Editar">
            ✏️
          </button>
          <button class="btn btn--sm btn--danger" data-action="delete" data-id="${plant.id}">
            🗑 Eliminar
          </button>
        </div>
      </div>
    `;

    return card;
  }

  /* ---------------- Utilidades de texto ---------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Fecha de hoy en formato YYYY-MM-DD (zona local). */
  function todayISO() {
    return isoFromDate(new Date());
  }

  /** Convierte un objeto Date a cadena YYYY-MM-DD en zona local. */
  function isoFromDate(date) {
    const off = date.getTimezoneOffset();
    const local = new Date(date.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  /* ====================================================================
     ACCIONES SOBRE PLANTAS
     ==================================================================== */
  function waterPlant(id) {
    const plant = plants.find((p) => p.id === id);
    if (!plant) return;
    plant.ultimo = todayISO();
    save();
    render();
  }

  function deletePlant(id) {
    const plant = plants.find((p) => p.id === id);
    if (!plant) return;
    const ok = window.confirm(`¿Eliminar "${plant.name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    plants = plants.filter((p) => p.id !== id);
    save();
    render();
  }

  function addPlant(data) {
    plants.push({
      id: Date.now(),
      name: data.name,
      tipo: data.tipo,
      cada: data.cada,
      ultimo: data.ultimo,
      color: data.color,
    });
    save();
    render();
  }

  function updatePlant(id, data) {
    const plant = plants.find((p) => p.id === id);
    if (!plant) return;
    // Conservamos el id original y solo actualizamos los campos editables
    plant.name = data.name;
    plant.tipo = data.tipo;
    plant.cada = data.cada;
    plant.ultimo = data.ultimo;
    plant.color = data.color;
    save();
    render();
  }

  /* ====================================================================
     CALENDARIO DE RIEGO
     ==================================================================== */

  /**
   * Devuelve las plantas que toca regar en una fecha dada.
   * Un riego cae en los múltiplos de "cada" días contados desde "ultimo".
   * @returns {Array<{name:string, level:string}>}
   */
  function plantsDueOn(date) {
    const due = [];
    plants.forEach((plant) => {
      const last = new Date(plant.ultimo + "T00:00:00");
      const diff = Math.round((date - last) / MS_PER_DAY);
      if (diff > 0 && diff % plant.cada === 0) {
        // En el calendario cada planta se identifica por su color propio
        due.push({ name: plant.name, color: plant.color });
      }
    });
    return due;
  }

  /** Dibuja la cuadrícula del mes guardado en calDate. */
  function renderCalendar() {
    if (!calDate) return;

    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    calLabel.textContent = `${MONTHS[month]} ${year}`;

    calGrid.innerHTML = "";

    // Cabecera con los nombres de los días
    WEEKDAYS.forEach((w) => {
      const head = document.createElement("div");
      head.className = "cal-weekday";
      head.textContent = w;
      calGrid.appendChild(head);
    });

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = todayISO();

    // Celdas vacías antes del día 1
    for (let i = 0; i < startOffset; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-cell cal-cell--empty";
      calGrid.appendChild(blank);
    }

    // Un celda por cada día del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const iso = isoFromDate(cellDate);
      const due = plantsDueOn(cellDate);

      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (iso === todayStr) cell.classList.add("cal-cell--today");

      const num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = day;
      cell.appendChild(num);

      if (due.length > 0) {
        cell.classList.add("cal-cell--has");
        cell.tabIndex = 0;
        cell.setAttribute("role", "button");
        cell.dataset.iso = iso;
        cell.setAttribute(
          "aria-label",
          `${day} de ${MONTHS[month]}: ${due.length} planta${due.length === 1 ? "" : "s"} por regar`
        );

        const marks = document.createElement("div");
        marks.className = "cal-marks";

        if (due.length === 1) {
          // Una sola planta -> badge con el nombre y su color identificativo
          const badge = document.createElement("span");
          badge.className = "cal-badge";
          badge.style.background = due[0].color;
          badge.textContent = due[0].name;
          marks.appendChild(badge);
        } else {
          // Varias plantas -> un punto del color de cada una
          due.forEach((d) => {
            const dot = document.createElement("span");
            dot.className = "cal-dot";
            dot.style.background = d.color;
            marks.appendChild(dot);
          });
        }

        cell.appendChild(marks);
      }

      calGrid.appendChild(cell);
    }
  }

  /** Cierra cualquier lista desplegable de día abierta. */
  function closeCalPopovers() {
    const open = calGrid.querySelectorAll(".cal-popover");
    open.forEach((p) => p.remove());
  }

  /** Abre/cierra la lista de plantas de un día concreto. */
  function toggleDayPopover(cell) {
    const alreadyOpen = cell.querySelector(".cal-popover");
    closeCalPopovers();
    if (alreadyOpen) return; // estaba abierta -> queda cerrada

    const date = new Date(cell.dataset.iso + "T00:00:00");
    const due = plantsDueOn(date);
    if (due.length === 0) return;

    const pop = document.createElement("div");
    pop.className = "cal-popover";
    pop.setAttribute("role", "dialog");

    const ul = document.createElement("ul");
    due.forEach((d) => {
      const li = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = "cal-dot";
      dot.style.background = d.color;
      li.appendChild(dot);
      li.appendChild(document.createTextNode(d.name));
      ul.appendChild(li);
    });
    pop.appendChild(ul);
    cell.appendChild(pop);
  }

  /* ====================================================================
     MODAL
     ==================================================================== */
  // Si recibe una planta, abre el modal en modo edición con los datos rellenos.
  function openModal(plant) {
    lastFocused = document.activeElement;
    form.reset();
    formError.hidden = true;

    if (plant) {
      // Modo edición
      editingId = plant.id;
      modalTitle.textContent = "Editar planta";
      btnSubmit.textContent = "Guardar cambios";
      fName.value = plant.name;
      fTipo.value = plant.tipo;
      fCada.value = plant.cada;
      fUltimo.value = plant.ultimo;
      fColor.value = plant.color || nextAvailableColor();
    } else {
      // Modo alta nueva: precargamos un color libre de la paleta.
      // Si el usuario no lo cambia, se guarda este color (no repetido).
      editingId = null;
      modalTitle.textContent = "Nueva planta";
      btnSubmit.textContent = "Guardar planta";
      fUltimo.value = todayISO(); // por defecto, hoy
      fColor.value = nextAvailableColor();
    }

    syncSwatches(); // resalta la muestra de la paleta que coincide con el color

    modalOverlay.hidden = false;
    fName.focus();
    document.addEventListener("keydown", onModalKeydown);
  }

  function closeModal() {
    modalOverlay.hidden = true;
    editingId = null; // descartamos cualquier edición en curso
    document.removeEventListener("keydown", onModalKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  // Crea una vez los botones de la paleta de colores dentro del formulario.
  function buildSwatches() {
    PALETTE.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.style.background = color;
      btn.dataset.color = color;
      btn.setAttribute("aria-label", `Color ${color}`);
      btn.addEventListener("click", () => {
        fColor.value = color;
        syncSwatches();
      });
      swatches.appendChild(btn);
    });
  }

  // Marca como activa la muestra cuyo color coincide con el seleccionado.
  function syncSwatches() {
    const current = (fColor.value || "").toUpperCase();
    swatches.querySelectorAll(".swatch").forEach((s) => {
      const match = s.dataset.color.toUpperCase() === current;
      s.classList.toggle("swatch--active", match);
      s.setAttribute("aria-pressed", match ? "true" : "false");
    });
  }

  // Accesibilidad: cerrar con Escape y atrapar el foco dentro del modal (Tab)
  function onModalKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const focusables = modalOverlay.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /** Valida el formulario y devuelve los datos o null. */
  function readForm() {
    const name = fName.value.trim();
    const tipo = fTipo.value;
    const cada = parseInt(fCada.value, 10);
    const ultimo = fUltimo.value;

    if (!name) return showFormError("Escribe un nombre para la planta.");
    if (!tipo) return showFormError("Selecciona un tipo.");
    if (!Number.isInteger(cada) || cada < 1) {
      return showFormError("La frecuencia debe ser un número de días mayor que 0.");
    }
    if (!ultimo) return showFormError("Indica la fecha del último riego.");
    if (ultimo > todayISO()) {
      return showFormError("La fecha del último riego no puede ser futura.");
    }

    formError.hidden = true;
    return { name, tipo, cada, ultimo, color: fColor.value };
  }

  function showFormError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
    return null;
  }

  /* ====================================================================
     EVENTOS
     ==================================================================== */
  function bindEvents() {
    // openModal sin argumento = alta nueva (ignoramos el objeto event)
    $("#btnAdd").addEventListener("click", () => openModal());
    $("#btnAddFloating").addEventListener("click", () => openModal());
    $("#btnCancel").addEventListener("click", closeModal);

    // Al elegir un color personalizado, sincronizamos las muestras
    fColor.addEventListener("input", syncSwatches);

    // Cerrar al hacer clic fuera del cuadro del modal
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Envío del formulario
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = readForm();
      if (!data) return;
      if (editingId !== null) {
        updatePlant(editingId, data); // usamos el id para localizar el registro
      } else {
        addPlant(data);
      }
      closeModal();
    });

    // Delegación de eventos para los botones de cada tarjeta
    plantList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.dataset.action === "water") waterPlant(id);
      else if (btn.dataset.action === "delete") deletePlant(id);
      else if (btn.dataset.action === "edit") {
        const plant = plants.find((p) => p.id === id);
        if (plant) openModal(plant); // reutiliza el mismo modal en modo edición
      }
    });

    // ---- Calendario ----
    calPrev.addEventListener("click", () => {
      calDate.setMonth(calDate.getMonth() - 1);
      closeCalPopovers();
      renderCalendar();
    });

    calNext.addEventListener("click", () => {
      calDate.setMonth(calDate.getMonth() + 1);
      closeCalPopovers();
      renderCalendar();
    });

    // Clic en un día con plantas -> mostrar/ocultar la lista
    calGrid.addEventListener("click", (e) => {
      const cell = e.target.closest(".cal-cell--has");
      if (!cell) {
        closeCalPopovers();
        return;
      }
      toggleDayPopover(cell);
    });

    // Accesibilidad: abrir la lista con Enter o Espacio
    calGrid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const cell = e.target.closest(".cal-cell--has");
      if (!cell) return;
      e.preventDefault();
      toggleDayPopover(cell);
    });
  }

  /* ====================================================================
     INICIO
     ==================================================================== */
  function init() {
    load();
    buildSwatches(); // crea la paleta de colores del formulario una sola vez

    // El calendario arranca en el mes actual
    calDate = new Date();
    calDate.setDate(1);
    calDate.setHours(0, 0, 0, 0);

    bindEvents();
    render(); // render() también dibuja el calendario
  }

  document.addEventListener("DOMContentLoaded", init);
})();
