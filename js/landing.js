"use strict";

/* ------------------------------------------------------------------
   MotoFlow.landing  ->  interactividad de la pantalla de entrada
   - grilla de motos (imagenes desde S3 + slot de respaldo)
   - filtros por categoria generados desde los datos
   - SEARCH: entra a la app (Mapa). El widget de reserva (locacion,
     fechas, horas) vivi en el Facturador (facturador.html)
   - calculadora de tarifas (desglose demo -> #precio-final)
------------------------------------------------------------------- */

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let fleet = [];

  const WEATHER_TAX = 0.21;

  const money = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  /* ---------------- Navbar: scroll suave a anclas ---------------- */
  $$("a.nav-link-land").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------------- Imágenes no arrastrables ---------------- */
  document.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });

  /* ---------------- Carga de datos ---------------- */
  function init() {
    window.MotoFlow.api
      .fetchMotos()
      .then((motos) => {
        fleet = motos;
        renderPills();
        renderCatalog("todas");
        fillCalcSelect();
        recomputeFare();
      })
      .catch(() => {
        const grid = $("#land-grid");
        if (grid) grid.innerHTML = '<p class="js-hint">No se pudo cargar la flota.</p>';
      });
  }

  /* ---------------- Filtros (generados desde los datos) ---------------- */
  function renderPills() {
    const container = $("#filters");
    const cats = ["todas"].concat(
      Array.from(new Set(fleet.map((m) => m.categoria)))
    );

    container.innerHTML = cats
      .map(
        (c, i) =>
          `<button class="pill ${i === 0 ? "active" : ""}" data-cat="${c}">` +
          labelCat(c) +
          "</button>"
      )
      .join("");

    $$(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        $$(".pill").forEach((p) => p.classList.toggle("active", p === pill));
        renderCatalog(pill.dataset.cat);
      });
    });
  }

  function labelCat(c) {
    if (c === "todas") return "Todas";
    if (c === "scooter") return "Scooters";
    if (c === "deportiva") return "Deportivas";
    if (c === "electrica") return "Eléctricas";
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  /* ---------------- Catálogo ---------------- */
  function renderCatalog(filter) {
    const grid = $("#land-grid");
    grid.innerHTML = fleet
      .filter((m) => filter === "todas" || m.categoria === filter)
      .map(
        (m) => `
        <article class="card moto-card">
          <div class="card-img">
            ${imgSlot(m)}
          </div>
          <div class="moto-head">
            <span class="card-title">${m.nombre}</span>
            <span class="badge ${m.disponible ? "ok" : "off"}">${m.disponible ? "Disponible" : "No disponible"}</span>
          </div>
          <div class="card-foot">
            <div class="moto-price">${money.format(m.precio_dia)} <small>/día</small></div>
            <div class="actions">
              <button class="icon-btn" data-disabled title="Ver especificaciones">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              ${m.disponible
                ? '<button type="button" class="btn btn-accent btn-sm" data-ir="facturador.html?moto=' + m.id + '"><span>Alquilar</span><span class="spinner hidden"></span></button>'
                : '<button class="btn btn-disabled btn-sm" disabled>No disponible</button>'}
            </div>
          </div>
        </article>`
      )
      .join("");
  }

  // Imagen desde S3; si falla o no hay, queda el slot de respaldo.
  function imgSlot(m) {
    if (!m.imagen) return "<span>Slot de imagen</span>";
    return (
      '<img src="' +
      m.imagen +
      '" alt="' +
      m.nombre +
      '" loading="lazy" draggable="false" ' +
      'onerror="this.parentNode.innerHTML = \'<span>Slot de imagen</span>\'" />'
    );
  }

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

  /* ---------------- Calculadora de tarifas (motor C++) ---------------- */
  const calcMoto = $("#calc-moto");
  const calcDays = $("#calc-days");

  function fillCalcSelect() {
    calcMoto.innerHTML = fleet
      .map(
        (m) =>
          '<option value="' +
          m.id +
          '">' +
          m.nombre +
          " - " +
          money.format(m.precio_dia) +
          "/día</option>"
      )
      .join("");
  }

  function recomputeFare() {
    if (!fleet.length) return;
    const moto = fleet.find((m) => String(m.id) === String(calcMoto.value));
    if (!moto) return;

    const motor = window.MotoFlow.motor;

    // Demanda real (motos libres de la flota + hora actual) y clima simulado.
    const libres = fleet.filter((m) => m.disponible).length;
    const hora = new Date().getHours();
    const clima = motor.climaSimulado();

    const dFactor = motor.factorDemanda(libres, hora);
    const cFactor = motor.factorClima(clima.code);

    const dias = Math.min(30, Math.max(1, parseInt(calcDays.value, 10) || 1));
    const precioDiaEfectivo = moto.precio_dia * dFactor * cFactor;
    const base = precioDiaEfectivo * dias;
    const tax = base * WEATHER_TAX;
    const total = base + tax;

    $("#calc-dias").textContent = dias + (dias === 1 ? " día" : " días");
    $("#calc-demand").textContent = "x" + dFactor.toFixed(2) + "  (" + libres + " libres)";
    $("#calc-weather").textContent = clima.nombre + (cFactor > 1 ? "  (x" + cFactor.toFixed(2) + ")" : "");
    $("#calc-base").textContent = money.format(base);
    $("#calc-tax").textContent = money.format(tax);
    $("#precio-final").textContent = money.format(total);
  }

  calcMoto.addEventListener("change", recomputeFare);
  calcDays.addEventListener("input", recomputeFare);

  init();
})();