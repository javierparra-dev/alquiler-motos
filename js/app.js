"use strict";

/* ------------------------------------------------------------------
   MotoFlow.app  ->  UI: navegacion de vistas, tarifa dinamica
   - switcher de vistas desde la navbar
   - toast generico para botones "en construccion" ([data-disabled])
   - render de motos y flota desde data/motos.json
   - tarifa y mantenimiento calculados por el motor C++ (js/motor.js)
------------------------------------------------------------------- */

window.MotoFlow = window.MotoFlow || {};

(function (ns) {
  const $ = (sel) => document.querySelector(sel);

  const el = {
    pickup: $("#pickup"),
    dropoff: $("#dropoff"),
    moto: $("#moto"),
    simulate: $("#simulate"),
    reset: $("#reset"),
    result: $("#result"),
    rDist: $("#r-dist"),
    rTime: $("#r-time"),
    rDemand: $("#r-demand"),
    rWeather: $("#r-weather"),
    rMotor: $("#r-motor"),
    rTotal: $("#r-total"),
  };

  const menu = $("#menu");
  const app = $("#app");
  const toast = $("#toast");

  let toastTimer = null;
  let fleet = [];
  let tripSummary = null;

  /* ---------------- Vistas ---------------- */
  const views = document.querySelectorAll(".view");
  const navLinks = document.querySelectorAll(".nav-link");

  function go(viewId) {
    views.forEach((v) => v.classList.toggle("active", v.id === "view-" + viewId));
    navLinks.forEach((l) => l.classList.toggle("active", l.dataset.view === viewId));
    const main = $(".app-main");
    if (main) main.scrollTop = 0;
    if (viewId === "map" && ns.map) {
      setTimeout(() => ns.map.invalidateSize(), 60);
    }
  }

  navLinks.forEach((l) => l.addEventListener("click", () => go(l.dataset.view)));

  /* ---------------- Home / App ---------------- */
  function enterApp() {
    menu.classList.add("menu-hidden");
    setTimeout(() => {
      menu.style.display = "none";
      app.classList.add("active");
      go("map");
      if (ns.map) ns.map.invalidateSize();
    }, 430);
  }
  ns.enterApp = enterApp;

  function showMenu() {
    app.classList.remove("active");
    menu.style.display = "block";
    requestAnimationFrame(() => menu.classList.remove("menu-hidden"));
  }

  document.querySelectorAll("[data-enter]").forEach((b) => b.addEventListener("click", enterApp));
  document.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => {
      enterApp();
      // go() se corre despues de montar #app (dentro del timeout de enterApp)
      setTimeout(() => go(b.dataset.goto), 450);
    })
  );
  $("#btn-home").addEventListener("click", showMenu);

  /* ---------------- Toast generico (botones en construccion) ---------------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-disabled]");
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    showToast();
  });

  function showToast(message) {
    toast.textContent =
      message || "En construcción : se habilita en próximas actualizaciones";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* ---------------- Mapa / tarifa (motor C++) ---------------- */
  ns.onPointsChanged = function () {
    el.simulate.disabled = !ns.hasRoute();
    if (ns.hasRoute()) el.simulate.textContent = "Simular viaje";
  };

  ns.onPointUpdated = function (which, info) {
    el[which].value = info.label;
  };

  ns.onRouteResolved = function (summary) {
    tripSummary = summary;
    el.simulate.textContent = "Simular viaje";
    showFare();
  };

  ns.onTripFinished = function () {
    // La simulacion llego a destino
  };

  // Hay viaje en curso: el mapa no deja cargar puntos nuevos sin Limpiar.
  ns.isTripActive = () =>
    Boolean(tripSummary) || !el.result.classList.contains("hidden");
  ns.onTripBlocked = () => showToast("Limpiá el viaje anterior antes de cargar uno nuevo");

  function showFare() {
    if (!tripSummary) return;

    const moto = fleet.find((m) => String(m.id) === String(el.moto.value));
    const motor = ns.motor;

    // Demanda real: motos libres de la flota + hora actual del dia.
    const libres = fleet.filter((m) => m.disponible).length;
    const hora = new Date().getHours();
    const clima = motor.climaSimulado();

    const dFactor = motor.factorDemanda(libres, hora);
    const cFactor = motor.factorClima(clima.code);
    const price = motor.tarifaDinamica(
      moto.precio_base,
      moto.precio_km,
      tripSummary.distanceKm,
      libres,
      clima.code,
      hora
    );

    el.result.classList.remove("hidden");
    el.reset.classList.add("pulse");
    el.rDist.textContent = tripSummary.distanceKm.toFixed(2) + " km";
    el.rTime.textContent = formatTime(tripSummary.durationSec);
    el.rDemand.textContent = "x" + dFactor.toFixed(2) + "  (" + libres + " motos libres)";
    el.rWeather.textContent =
      clima.nombre + (cFactor > 1 ? "  (x" + cFactor.toFixed(2) + ")" : "");
    el.rTotal.textContent = moneyARS(price);
    el.rMotor.textContent =
      "motor " + (motor.modo === "wasm" ? "C++ (WASM)" : "C++ (demo, sin WASM)");
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m + " min " + s + " s";
  }

  const moneyARS = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  el.reset.addEventListener("click", () => {
    ns.reset();
    el.pickup.value = "";
    el.dropoff.value = "";
    el.result.classList.add("hidden");
    el.reset.classList.remove("pulse");
    tripSummary = null;
    el.simulate.disabled = true;
    el.simulate.textContent = "Simular viaje";
  });

  el.simulate.addEventListener("click", () => {
    if (!ns.hasRoute()) {
      el.simulate.disabled = true;
      return;
    }
    el.simulate.disabled = true;
    el.simulate.textContent = "Trazando ruta...";
    ns.revealRoute();
  });

  /* ---------------- Datos (motos simuladas) ---------------- */
  fetch("data/motos.json")
    .then((r) => r.json())
    .then((data) => {
      fleet = data.motos;
      renderAll();
    })
    .catch(() => {
      fleet = [
        { id: 1, nombre: "Honda CG 160", tipo: "city", precio_base: 3.0, precio_km: 0.45, km: 8400, horas_uso: 320, disponible: true },
        { id: 2, nombre: "Yamaha FZ 25", tipo: "city", precio_base: 5.0, precio_km: 0.6, km: 2100, horas_uso: 95, disponible: true },
      ];
      renderAll();
    });

  function renderAll() {
    el.moto.innerHTML = fleet
      .map(
        (m) =>
          '<option value="' +
          m.id +
          '">' +
          m.nombre +
          " - ARS " +
          m.precio_km +
          "/km</option>"
      )
      .join("");

    el.moto.addEventListener("change", () => {
      if (tripSummary) showFare();
    });

    renderMotos();
    renderFlota();
  }

  /* ---------------- Vista: Buscar moto ---------------- */
  function renderMotos() {
    const grid = $("#moto-grid");
    grid.innerHTML = fleet
      .map(
        (m) => `
        <article class="card moto-card">
          <div class="moto-head">
            <span class="card-title">${m.nombre}</span>
            <span class="badge ${m.disponible ? "ok" : "off"}">${m.disponible ? "Disponible" : "No disponible"}</span>
          </div>
          <p class="card-desc">${capitalize(m.tipo)} · ${m.km.toLocaleString("es-AR")} km · ${m.horas_uso} h de uso</p>
          <div class="moto-price">$${m.precio_km.toFixed(2)} <small>/km</small></div>
          <button class="btn ${m.disponible ? "btn-accent" : "btn-disabled"}" ${
          m.disponible ? "data-disabled" : "disabled"
        }>${m.disponible ? "Alquilar ahora" : "No disponible"}</button>
        </article>`
      )
      .join("");
  }

  /* ---------------- Vista: Flota ---------------- */
  function renderFlota() {
    const tbody = $("#flota-body");
    tbody.innerHTML = fleet
      .map((m) => {
        const mant = ns.motor.estadoMantenimiento(m.km, m.horas_uso); // 0 OK / 1 proximo / 2 taller
        const mantBadge =
          '<span class="badge ' + (mant ? "warn" : "ok") + '">' +
          ns.motor.mantenimientoLabel(m.km, m.horas_uso) +
          "</span>";
        return `
          <tr>
            <td>${m.nombre}</td>
            <td>${capitalize(m.tipo)}</td>
            <td>${m.km.toLocaleString("es-AR")} km</td>
            <td>${m.horas_uso} h</td>
            <td><span class="badge ${m.disponible ? "ok" : "off"}">${m.disponible ? "Disponible" : "No disponible"}</span></td>
            <td>${mantBadge}</td>
            <td><button class="btn btn-ghost-sm" data-disabled>Programar taller</button></td>
          </tr>`;
      })
      .join("");
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
})(window.MotoFlow);