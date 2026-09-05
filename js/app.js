"use strict";

/* ------------------------------------------------------------------
   MotoFlow.app  ->  UI: seleccion de moto, tarifa dinamica (demo)
   Cuando este listo, el calculo de tarifa pasara al motor C++ (WASM)
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
    rTotal: $("#r-total"),
  };

  let fleet = [];
  let tripSummary = null;

  const WEATHER = ["soleado", "nublado", "lluvia"];

  // Esperamos un momento y llamamos al "motor de tarifas"
  // (hoy en JS; manana en C++ via WASM)
  function calculateFare(moto, distanceKm, demand, weather) {
    const weatherMult = { soleado: 1, nublado: 1.15, lluvia: 1.35 }[weather] || 1;
    const price = moto.precio_base + moto.precio_km * distanceKm * weatherMult * demand;
    return {
      price: price,
      demand,
      weather,
      weatherMult,
    };
  }

  function simulate() {
    if (!ns.hasRoute()) {
      el.simulate.disabled = true;
      return;
    }
    el.simulate.disabled = true;
    el.simulate.textContent = "Trazando ruta...";
    ns.revealRoute();
  }

  ns.onPointsChanged = function () {
    el.simulate.disabled = !ns.hasRoute();
    if (ns.hasRoute()) el.simulate.textContent = "Simular viaje";
  };

  ns.onPointUpdated = function (which, latlng) {
    el[which].value = latlng.lat.toFixed(5) + ", " + latlng.lng.toFixed(5);
  };

  ns.onRouteResolved = function (summary) {
    tripSummary = summary;
    el.simulate.textContent = "Simular viaje";
    showFare();
  };

  ns.onTripFinished = function () {
    // La sim llego a destino; por ahora no hace nada extra
  };

  function showFare() {
    if (!tripSummary) return;

    const moto = fleet.find((m) => m.id === el.moto.value);
    const demand = round(0.8 + Math.random() * 0.9); // 0.8 a 1.7 (simulado)
    const weather = WEATHER[Math.floor(Math.random() * WEATHER.length)];

    const fare = calculateFare(moto, tripSummary.distanceKm, demand, weather);

    el.result.classList.remove("hidden");
    el.rDist.textContent = tripSummary.distanceKm.toFixed(2) + " km";
    el.rTime.textContent = formatTime(tripSummary.durationSec);
    el.rDemand.textContent = "x" + demand.toFixed(2);
    el.rWeather.textContent = weather + (fare.weatherMult > 1 ? " (x" + fare.weatherMult + ")" : "");
    el.rTotal.textContent = "$ " + fare.price.toFixed(2);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m + " min " + s + " s";
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  el.reset.addEventListener("click", () => {
    ns.reset();
    el.pickup.value = "";
    el.dropoff.value = "";
    el.result.classList.add("hidden");
    tripSummary = null;
    el.simulate.disabled = true;
    el.simulate.textContent = "Simular viaje";
  });

  el.simulate.addEventListener("click", simulate);

  fetch("data/motos.json")
    .then((r) => r.json())
    .then((data) => {
      fleet = data.motos;
      fillMotoSelect();
    })
    .catch(() => {
      // sin datos -> 2 motos de ejemplo
      fleet = [
        { id: 1, nombre: "Honda CG 160", precio_base: 3.0, precio_km: 0.45 },
        { id: 2, nombre: "Yamaha FZ 25", precio_base: 5.0, precio_km: 0.6 },
      ];
      fillMotoSelect();
    });

  function fillMotoSelect() {
    el.moto.innerHTML = fleet
      .map((m) => '<option value="' + m.id + '">' + m.nombre + " - $" + m.precio_km + "/km</option>")
      .join("");
    el.moto.addEventListener("change", () => {
      if (tripSummary) showFare();
    });
  }
})(window.MotoFlow);