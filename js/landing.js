"use strict";

/* ------------------------------------------------------------------
   MotoFlow.landing  ->  interactividad de la pantalla de entrada
   - grilla de motos (filtros por categoria, slots de imagen)
   - widget de reserva: locacion devolucion, sliders de hora, SEARCH
   - calculadora de tarifas (desglose demo -> #precio-final)
------------------------------------------------------------------- */

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let fleet = [];

  const WEATHER_TAX = 0.21;
  const CATS = ["scooter", "deportiva", "electrica"];

  /* ---------------- Carga de datos ---------------- */
  function init() {
    fetch("data/motos.json")
      .then((r) => r.json())
      .then((data) => {
        fleet = data.motos;
        renderCatalog();
        fillCalcSelect();
        recomputeFare();
      });
  }

  /* ---------------- Catalogo + filtros ---------------- */
  function renderCatalog(filter) {
    const grid = $("#land-grid");
    grid.innerHTML = fleet
      .map(
        (m) => `
        <article class="card moto-card" data-cat="${m.categoria}">
          <div class="card-img" data-img>Slot de imagen</div>
          <div class="moto-head">
            <span class="card-title">${m.nombre}</span>
            <span class="badge ${m.disponible ? "ok" : "off"}">${m.disponible ? "Disponible" : "No disponible"}</span>
          </div>
          <div class="card-foot">
            <div class="moto-price">$${m.precio_dia} <small>/día</small></div>
            <div class="actions">
              <button class="icon-btn" data-disabled title="Ver especificaciones">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button class="btn ${m.disponible ? "btn-accent btn-sm" : "btn-disabled btn-sm"}" ${
          m.disponible ? "data-disabled" : "disabled"
        }>${m.disponible ? "Alquilar" : "No disponible"}</button>
            </div>
          </div>
        </article>`
      )
      .join("");
  }

  $$(".pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$(".pill").forEach((p) => p.classList.toggle("active", p === pill));
      const cat = pill.dataset.cat;
      $$("#land-grid .moto-card").forEach((card) => {
        const show = cat === "todas" || card.dataset.cat === cat;
        card.style.display = show ? "" : "none";
      });
    });
  });

  /* ---------------- Widget: locacion de devolucion ---------------- */
  const toggleReturn = $("#toggle-return");
  const locDropoff = $("#loc-dropoff");

  toggleReturn.addEventListener("click", () => {
    locDropoff.classList.toggle("hidden");
    toggleReturn.textContent = locDropoff.classList.contains("hidden")
      ? "Diferente locación de devolución"
      : "Misma locación de devolución";
  });

  /* ---------------- Widget: sliders de hora ---------------- */
  function slotToTime(v) {
    const h = Math.floor(v / 2);
    const m = v % 2 === 1 ? "30" : "00";
    return String(h).padStart(2, "0") + ":" + m;
  }

  const timeOut = $("#time-out");
  const timeBack = $("#time-back");
  $("#time-out-val").textContent = slotToTime(+timeOut.value);
  $("#time-back-val").textContent = slotToTime(+timeBack.value);

  timeOut.addEventListener("input", () => {
    $("#time-out-val").textContent = slotToTime(+timeOut.value);
  });
  timeBack.addEventListener("input", () => {
    $("#time-back-val").textContent = slotToTime(+timeBack.value);
  });

  /* ---------------- Widget: fechas por defecto ---------------- */
  function isoToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function isoTodayPlus(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  $("#date-start").value = isoToday();
  $("#date-end").value = isoTodayPlus(2);

  /* ---------------- SEARCH (entra a la app -> mapa) ---------------- */
  const searchBtn = $("#search-btn");
  const spinner = $("#spinner");

  searchBtn.addEventListener("click", () => {
    searchBtn.disabled = true;
    spinner.classList.remove("hidden");
    setTimeout(() => {
      spinner.classList.add("hidden");
      searchBtn.disabled = false;
      if (window.MotoFlow && window.MotoFlow.enterApp) {
        window.MotoFlow.enterApp();
      }
    }, 1000);
  });

  /* ---------------- Calculadora de tarifas (demo) ---------------- */
  const calcMoto = $("#calc-moto");
  const dateStart = $("#date-start");
  const dateEnd = $("#date-end");

  function fillCalcSelect() {
    calcMoto.innerHTML = fleet
      .map((m) => '<option value="' + m.id + '">' + m.nombre + " - $" + m.precio_dia + "/día</option>")
      .join("");
  }

  function daysBetween(a, b) {
    const t = Date.parse(b) - Date.parse(a);
    const d = Math.round(t / 86400000);
    return d >= 1 ? d : 1;
  }

  function money(n) {
    return "$ " + n.toFixed(2);
  }

  function recomputeFare() {
    if (!fleet.length) return;
    const moto = fleet.find((m) => String(m.id) === String(calcMoto.value));
    if (!moto) return;

    const dias = daysBetween(dateStart.value, dateEnd.value);
    const base = moto.precio_dia * dias;
    const tax = base * WEATHER_TAX;
    const total = base + tax;

    $("#calc-dias").textContent = dias + (dias === 1 ? " día" : " días");
    $("#calc-base").textContent = money(base);
    $("#calc-tax").textContent = money(tax);
    $("#precio-final").textContent = money(total);
  }

  calcMoto.addEventListener("change", recomputeFare);
  dateStart.addEventListener("change", recomputeFare);
  dateEnd.addEventListener("change", recomputeFare);

  init();
})();