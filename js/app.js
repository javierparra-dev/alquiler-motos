"use strict";

/* ------------------------------------------------------------------
   MotoFlow.app  ->  UI: navegacion de vistas, tarifa dinamica
   - switcher de vistas desde la navbar
   - toast generico para botones "en construccion" ([data-disabled])
- motos desde js/api.js (MySQL si hay backend, si no data/motos.json)
   - tarifa y mantenimiento calculados por el motor C++ (js/motor.js)
   - viajes: guardar desde el mapa / Alquilar abre facturador.html (pestaña aparte)
   ------------------------------------------------------------------ */

window.MotoFlow = window.MotoFlow || {};

(function (ns) {
  const $ = (sel) => document.querySelector(sel);

  const el = {
    pickup: $("#pickup"),
    dropoff: $("#dropoff"),
    moto: $("#moto"),
    simulate: $("#simulate"),
    reset: $("#reset"),
    saveTrip: $("#save-trip"),
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
  let backendOn = false;
  let lastFare = 0;

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
    if (viewId === "viajes") renderViajes();
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

  /* ---------------- Imágenes no arrastrables ---------------- */
  document.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });

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

  /* ---------------- Navegación uniforme (igual que SEARCH: spinner + navega) ---------------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (!b) return;
    e.stopPropagation();
    b.disabled = true;
    const spin = b.querySelector(".spinner");
    if (spin) spin.classList.remove("hidden");
    const url = b.dataset.ir;
    setTimeout(() => {
      location.href = url;
    }, 700);
  });

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
    const libres = fleet.filter((m) => Number(m.disponible) === 1).length;
    const hora = new Date().getHours();
    const clima = motor.climaSimulado();

    const dFactor = motor.factorDemanda(libres, hora);
    const cFactor = motor.factorClima(clima.code);
    const price = motor.tarifaDinamica(
      Number(moto.precio_base),
      Number(moto.precio_km),
      tripSummary.distanceKm,
      libres,
      clima.code,
      hora
    );
    lastFare = price;

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

    if (backendOn) {
      el.saveTrip.style.display = "";
      el.saveTrip.textContent = "Guardar en Mis viajes";
    }
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
    el.saveTrip.style.display = "none";
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

  /* ---------------- Guardar viaje (requiere backend) ---------------- */
  el.saveTrip.addEventListener("click", async () => {
    if (!tripSummary) return;
    const moto = fleet.find((m) => String(m.id) === String(el.moto.value));
    if (!moto) return;

    const picks = tripSummary.latlngs || [];
    const a = picks[0] || [null, null];
    const b = picks[1] || [null, null];

    try {
      await ns.api.createViaje({
        moto_id: Number(moto.id),
        origen_calle: stripLabel(el.pickup.value),
        destino_calle: stripLabel(el.dropoff.value),
        origen_lat: a[0],
        origen_lng: a[1],
        destino_lat: b[0],
        destino_lng: b[1],
        distancia_km: Number(tripSummary.distanceKm || 0),
        duracion_seg: Math.floor(Number(tripSummary.durationSec || 0)),
        tarifa: lastFare,
        factor_demanda: Number(el.rDemand.textContent.match(/x([\d.]+)/)?.[1] || 1),
        factor_clima: Number(el.rWeather.textContent.match(/x([\d.]+)/)?.[1] || 1),
        clima_nombre: ns.motor.climaSimulado().nombre,
      });
      showToast("Viaje guardado en Mis viajes");
      el.saveTrip.style.display = "none";
    } catch (err) {
      showToast("No se pudo guardar: " + ((err && err.message) || "revisá el backend"));
    }
  });

  function stripLabel(label) {
    if (!label) return null;
    if (label.indexOf("Buscando calle") === 0) return null;
    return label;
  }

  /* ---------------- Datos (backend o data/motos.json) ---------------- */
  ns.api
    .fetchMotos()
    .then((motos) => {
      fleet = motos;
      renderAll();
      loadAlquilerPendiente();
    })
    .catch(() => {
      fleet = [
        { id: 1, nombre: "Honda CG 160", tipo: "city", precio_base: 3.0, precio_km: 0.45, km: 8400, horas_uso: 320, disponible: true },
        { id: 2, nombre: "Yamaha FZ 25", tipo: "city", precio_base: 5.0, precio_km: 0.6, km: 2100, horas_uso: 95, disponible: true },
      ];
      renderAll();
    });

  /* ---------------- Alquiler confirmado desde el Facturador ---------------- */
  const locLabels = {
    caba: "Buenos Aires (CABA)",
    norte: "Zona Norte",
    aeropuerto: "Aeropuerto",
    cba: "Córdoba",
  };

  function locLabel(v) {
    return locLabels[v] || String(v || "—");
  }

  function loadAlquilerPendiente() {
    const params = new URLSearchParams(location.search);
    if (params.get("alquiler") !== "1") return;
    const raw = sessionStorage.getItem("mf-alquiler");
    sessionStorage.removeItem("mf-alquiler");
    if (!raw) return;

    let alq;
    try {
      alq = JSON.parse(raw);
    } catch (e) {
      return;
    }

    enterApp();
    setTimeout(() => {
      const opt = Array.from(el.moto.options).find(
        (o) => String(o.value) === String(alq.moto_id)
      );
      if (opt) {
        el.moto.value = opt.value;
        if (tripSummary) showFare();
      }

      const pill = $("#rent-pill");
      if (pill) {
        const retiro = locLabel(alq.loc_pickup);
        const devol = alq.loc_dropoff ? locLabel(alq.loc_dropoff) : retiro;
        pill.classList.remove("hidden");
        pill.innerHTML =
          "<b>Alquiler confirmado</b>" +
          "<span>" + alq.moto_nombre + " · " + alq.qty + " moto" +
          (alq.qty > 1 ? "s" : "") + " · " + alq.dias +
          (alq.dias === 1 ? " día" : " días") + "</span>" +
          "<span>Retiro " + retiro + " → Devolución " + devol + "</span>" +
          "<span>" + alq.fecha_inicio + " → " + alq.fecha_fin + " · " +
          alq.hora_entrega + " hs · " + moneyARS(alq.total) + "</span>";
      }
    }, 550);
  }

  function renderAll() {
    el.moto.innerHTML = fleet
      .map(
        (m) =>
          '<option value="' +
          m.id +
          '">' +
          m.nombre +
          " - ARS " +
          Number(m.precio_km) +
          "/km</option>"
      )
      .join("");

    el.moto.addEventListener("change", () => {
      if (tripSummary) showFare();
    });

    renderMotos();
    renderFlota();
    renderViajes();

    // Detectamos el backend despues del primer render para no bloquear la demo.
    ns.api.isAvailable().then((ok) => {
      backendOn = ok;
      renderMotos();
      renderViajes();
    });
  }

  /* ---------------- Vista: Buscar moto ---------------- */
  function renderMotos() {
    const grid = $("#moto-grid");
    grid.innerHTML = fleet
      .map((m) => {
        const cta = m.disponible
          ? '<button type="button" class="btn btn-accent" data-ir="facturador.html?moto=' + m.id + '"><span>Alquilar</span><span class="spinner hidden"></span></button>'
          : '<button class="btn btn-disabled" disabled>No disponible</button>';
        return `
        <article class="card moto-card">
          <div class="moto-head">
            <span class="card-title">${m.nombre}</span>
            <span class="badge ${m.disponible ? "ok" : "off"}">${m.disponible ? "Disponible" : "No disponible"}</span>
          </div>
          <p class="card-desc">${capitalize(m.tipo)} · ${m.km.toLocaleString("es-AR")} km · ${Number(m.horas_uso)} h de uso</p>
          <div class="moto-price">$${Number(m.precio_km).toFixed(2)} <small>/km</small></div>
          ${cta}
        </article>`;
      })
      .join("");
  }

  /* ---------------- Vista: Flota ---------------- */
  function renderFlota() {
    const tbody = $("#flota-body");
    tbody.innerHTML = fleet
      .map((m) => {
        const mant = ns.motor.estadoMantenimiento(Number(m.km), Number(m.horas_uso)); // 0 OK / 1 proximo / 2 taller
        const mantBadge =
          '<span class="badge ' + (mant ? "warn" : "ok") + '">' +
          ns.motor.mantenimientoLabel(Number(m.km), Number(m.horas_uso)) +
          "</span>";
        return `
          <tr>
            <td>${m.nombre}</td>
            <td>${capitalize(m.tipo)}</td>
            <td>${m.km.toLocaleString("es-AR")} km</td>
            <td>${Number(m.horas_uso)} h</td>
            <td><span class="badge ${m.disponible ? "ok" : "off"}">${m.disponible ? "Disponible" : "No disponible"}</span></td>
            <td>${mantBadge}</td>
            <td><button class="btn btn-ghost-sm" data-disabled>Programar taller</button></td>
          </tr>`;
      })
      .join("");
  }

  /* ---------------- Vista: Mis viajes ---------------- */
  async function renderViajes() {
    const box = $("#viajes-list");
    if (!box) return;

    if (!backendOn) {
      box.innerHTML =
        '<div class="empty-circle">0</div>' +
        "<h3>Aún no tenés viajes</h3>" +
        "<p>Sin backend los viajes no se guardan. Cuando la app corra con PHP + MySQL, primero simulá una ruta en el mapa y tocá <b>Guardar en Mis viajes</b>.</p>";
      return;
    }

    box.innerHTML = '<p class="js-hint">Cargando viajes…</p>';
    try {
      const viajes = await ns.api.listViajes();
      if (!viajes.length) {
        box.innerHTML =
          '<div class="empty-circle">0</div>' +
          "<h3>Aún no tenés viajes</h3>" +
          '<p>Simulá una ruta en el mapa y tocá <b>Guardar en Mis viajes</b> para que aparezca acá.</p>';
        return;
      }
      box.classList.remove("empty-state");
      box.innerHTML = viajes
        .map(
          (v) => `
          <article class="card viaje-card">
            <div class="moto-head">
              <span class="card-title">${v.moto_nombre}</span>
              <span class="badge ok">${moneyARS(v.tarifa)}</span>
            </div>
            <p class="card-desc">${v.origen_calle || "Origen"} → ${v.destino_calle || "Destino"}</p>
            <div class="moto-price">${Number(v.distancia_km).toLocaleString("es-AR")} km · ${fmtDate(v.creado_en)}</div>
          </article>`
        )
        .join("");
    } catch (err) {
      box.innerHTML = '<p class="js-hint">No se pudo listar: revisá el backend.</p>';
    }
  }

  function fmtDate(s) {
    const parts = String(s || "").split(" ");
    const [y, m, d] = (parts[0] || "").split("-");
    if (!y || !m || !d) return String(s);
    const [h, mi] = (parts[1] || "").split(":");
    return d + "/" + m + "/" + y + " " + (h || "00") + "." + (mi || "00") + " hs";
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
})(window.MotoFlow);