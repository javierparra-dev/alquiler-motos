"use strict";

/* ------------------------------------------------------------------
   MotoFlow.facturador -> pantalla aparte para confirmar el alquiler.
   - No carga el mapa ni Leaflet: solo api.js (flota) + motor.js
     (mantenimiento) -> carga liviana.
   - Recibe la moto por URL (?moto=ID); si falta, muestra un selector.
   - Datos de la reserva (pasados a la landing): locacion de retiro y
     devolucion, fechas, horas, cantidad de motos.
   - Total ARS = precio por dia x cantidad x dias (dias = rango fechas).
   - Confirmar: guarda el alquiler en sessionStorage y redirige al mapa.
------------------------------------------------------------------- */

window.MotoFlow = window.MotoFlow || {};

(function () {
  const $ = (s) => document.querySelector(s);

  const els = {
    selWrap: $("#f-select-wrap"),
    sel: $("#f-select"),
    hint: $("#f-hint"),
    detail: $("#f-detail"),
    nombre: $("#f-nombre"),
    badge: $("#f-badge"),
    desc: $("#f-desc"),
    img: $("#f-img"),
    datos: $("#f-datos"),
    cant: $("#f-cant"),
    minus: $("#f-minus"),
    plus: $("#f-plus"),
    total: $("#f-total"),
    back: $("#f-back"),
    confirm: $("#f-confirm"),
    locPickup: $("#loc-pickup"),
    toggleReturn: $("#toggle-return"),
    locDropoff: $("#loc-dropoff"),
    dateStart: $("#date-start"),
    dateEnd: $("#date-end"),
    timeOut: $("#time-out"),
    timeBack: $("#time-back"),
    timeOutVal: $("#time-out-val"),
    timeBackVal: $("#time-back-val"),
    toast: $("#toast"),
  };

  const moneyARS = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  let fleet = [];
  let moto = null;
  let qty = 1;

  /* ---------------- Toast (botones en construccion) ---------------- */
  let toastTimer = null;
  function showToast(message) {
    els.toast.textContent =
      message || "En construcción : se habilita en próximas actualizaciones";
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-disabled]")) return;
    e.preventDefault();
    e.stopPropagation();
    showToast();
  });

  /* ---------------- Navegación uniforme (como SEARCH: spinner + navega) ---------------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (!b) return;
    e.stopPropagation();
    b.disabled = true;
    const spin = b.querySelector(".spinner");
    if (spin) spin.classList.remove("hidden");
    setTimeout(() => {
      location.href = b.dataset.ir;
    }, 400);
  });

  /* ---------------- Widget: retiro / devolución ---------------- */
  els.toggleReturn.addEventListener("click", () => {
    els.locDropoff.classList.toggle("hidden");
    els.toggleReturn.textContent = els.locDropoff.classList.contains("hidden")
      ? "Diferente locación de devolución"
      : "Misma locación de devolución";
  });

  /* ---------------- Widget: sliders de hora ---------------- */
  function slotToTime(v) {
    const h = Math.floor(v / 2);
    const m = v % 2 === 1 ? "30" : "00";
    return String(h).padStart(2, "0") + ":" + m;
  }

  els.timeOutVal.textContent = slotToTime(+els.timeOut.value);
  els.timeBackVal.textContent = slotToTime(+els.timeBack.value);

  els.timeOut.addEventListener("input", () => {
    els.timeOutVal.textContent = slotToTime(+els.timeOut.value);
  });
  els.timeBack.addEventListener("input", () => {
    els.timeBackVal.textContent = slotToTime(+els.timeBack.value);
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

  els.dateStart.value = isoToday();
  els.dateEnd.value = isoTodayPlus(2);
  els.dateStart.addEventListener("change", update);
  els.dateEnd.addEventListener("change", update);

  /* ---------------- Carga de flota ---------------- */
  const wantedId = new URLSearchParams(location.search).get("moto");

  window.MotoFlow.api
    .fetchMotos()
    .then((motos) => {
      fleet = motos;
      if (wantedId && fleet.some((m) => String(m.id) === String(wantedId))) {
        render(wantedId);
      } else if (fleet.length) {
        renderSelector();
      } else {
        els.hint.hidden = false;
        els.hint.textContent = "No se pudo cargar la flota.";
      }
    })
    .catch(() => {
      els.hint.hidden = false;
      els.hint.textContent = "No se pudo cargar la flota.";
    });

  function renderSelector() {
    els.selWrap.classList.remove("hidden");
    els.sel.innerHTML =
      '<option value="">Elegí una moto…</option>' +
      fleet
        .map(
          (m) =>
            '<option value="' +
            m.id +
            '">' +
            m.nombre +
            " · " +
            moneyARS.format(Number(m.precio_dia)) +
            "/día</option>"
        )
        .join("");
    els.sel.addEventListener("change", () => {
      if (els.sel.value) render(els.sel.value);
    });
  }

  /* ---------------- Render de la moto + facturador ---------------- */
  function render(id) {
    moto = fleet.find((m) => String(m.id) === String(id));
    if (!moto) return;

    els.selWrap.classList.add("hidden");
    els.nombre.textContent = moto.nombre;
    els.badge.innerHTML =
      '<span class="badge ' + (moto.disponible ? "ok" : "off") + '">' +
      (moto.disponible ? "Disponible" : "No disponible") +
      "</span>";
    els.desc.textContent = moto.descripcion || "Descripción pendiente para esta moto.";
    els.img.innerHTML =
      '<span class="img-slot"></span>' +
      (moto.imagen
        ? '<img src="' + moto.imagen + '" alt="' + moto.nombre + '" loading="lazy" onerror="this.remove()" />'
        : "");

    const mant = window.MotoFlow.motor.estadoMantenimiento(
      Number(moto.km),
      Number(moto.horas_uso)
    );
    const mantBadge =
      '<span class="badge ' + (mant === 0 ? "ok" : mant === 1 ? "warn" : "off") + '">' +
      window.MotoFlow.motor.mantenimientoLabel(Number(moto.km), Number(moto.horas_uso)) +
      "</span>";

    els.datos.innerHTML = [
      ["Moto", moto.nombre],
      ["Tipo", capitalize(moto.tipo)],
      ["Precio base", moneyARS.format(Number(moto.precio_base))],
      ["Precio por km", moneyARS.format(Number(moto.precio_km))],
      ["Precio por día", moneyARS.format(Number(moto.precio_dia))],
      ["Kilometraje", Number(moto.km).toLocaleString("es-AR") + " km"],
      ["Horas de uso", Number(moto.horas_uso) + " h"],
      ["Mantenimiento (motor)", mantBadge],
    ]
      .map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>")
      .join("");

    qty = 1;
    els.detail.classList.remove("hidden");
    update();
  }

  /* ---------------- Cantidad / dias (fechas) / total ---------------- */
  function daysFromRange() {
    const a = Date.parse(els.dateStart.value);
    const b = Date.parse(els.dateEnd.value);
    if (!a || isNaN(a) || !b || isNaN(b)) return 1;
    const d = Math.round((b - a) / 86400000);
    return Math.min(30, Math.max(1, d));
  }

  function update() {
    if (!moto) return;
    els.cant.textContent = String(qty);
    els.minus.disabled = qty <= 1;
    els.plus.disabled = qty >= 5;
    els.total.textContent = moneyARS.format(Number(moto.precio_dia) * qty * daysFromRange());
  }

  els.minus.addEventListener("click", () => {
    if (qty > 1) {
      qty--;
      update();
    }
  });
  els.plus.addEventListener("click", () => {
    if (qty < 5) {
      qty++;
      update();
    }
  });

  els.back.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.href = "index.html";
  });

  /* ---------------- Confirmar alquiler -> guarda y va al mapa ---------------- */
  els.confirm.addEventListener("click", () => {
    if (!moto) return;

    const a = Date.parse(els.dateStart.value);
    const b = Date.parse(els.dateEnd.value);
    if (!els.locPickup.value) {
      showToast("Elegí la locación de retiro");
      return;
    }
    if (!a || isNaN(a) || !b || isNaN(b) || b < a) {
      showToast("Revisá las fechas del alquiler");
      return;
    }

    const alquiler = {
      moto_id: String(moto.id),
      moto_nombre: moto.nombre,
      precio_dia: Number(moto.precio_dia),
      qty: qty,
      dias: daysFromRange(),
      loc_pickup: els.locPickup.value,
      loc_dropoff: els.locDropoff.classList.contains("hidden")
        ? null
        : els.locDropoff.value,
      fecha_inicio: els.dateStart.value,
      fecha_fin: els.dateEnd.value,
      hora_entrega: slotToTime(+els.timeOut.value),
      hora_devolucion: slotToTime(+els.timeBack.value),
      total: Number(moto.precio_dia) * qty * daysFromRange(),
    };
    sessionStorage.setItem("mf-alquiler", JSON.stringify(alquiler));

    els.confirm.disabled = true;
    const spin = els.confirm.querySelector(".spinner");
    if (spin) spin.classList.remove("hidden");
    setTimeout(() => {
      location.href = "index.html?alquiler=1";
    }, 600);
  });

  function capitalize(s) {
    return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
  }
})();