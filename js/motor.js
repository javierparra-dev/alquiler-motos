"use strict";

/* ------------------------------------------------------------------
   MotoFlow.motor -> puente hacia el motor C++ (WebAssembly)
   - Si wasm/out/motor.js esta compilado (Emscripten), usa las
     funciones reales de C++.
   - Si no (modo demo), replica el mismo algoritmo en JavaScript para
     que la app nunca se rompa.
   - Tambien provee el "simulador de clima" (no hay BDD todavia).
------------------------------------------------------------------- */

window.MotoFlow = window.MotoFlow || {};

(function (ns) {
  // ---------------- Replicas JS del algoritmo C++ ----------------
  const DEMANDA = { alta: 1.5, media: 1.25, baja: 1.0 };
  const HORA_PICO_EXTRA = 0.15;
  const CLIMA_MULT = [1.0, 1.1, 1.3, 1.5];
  const CLIMA_NOMBRES = ["soleado", "nublado", "lluvia", "tormenta"];

  function jsFactorDemanda(libres, hora) {
    let f = DEMANDA.baja;
    if (libres < 3) f = DEMANDA.alta;
    else if (libres <= 6) f = DEMANDA.media;

    const pico =
      (hora >= 7 && hora < 10) || (hora >= 17 && hora < 21);
    if (pico) f += HORA_PICO_EXTRA;
    return f;
  }

  function jsFactorClima(clima) {
    return CLIMA_MULT[clampInt(clima, 0, 3)];
  }

  function jsTarifaDinamica(base, precioKm, km, libres, clima, hora) {
    const sub = base + precioKm * km;
    return sub * jsFactorDemanda(libres, hora) * jsFactorClima(clima);
  }

  function jsScoreDesgaste(km, horas) {
    const km2 = Math.max(0, km);
    const h2 = Math.max(0, horas);
    const s = 50 * (km2 / 30000) + 50 * (h2 / 1000);
    return Math.min(100, s);
  }

  function jsEstadoMantenimiento(km, horas) {
    const s = jsScoreDesgaste(km, horas);
    if (s >= 70) return 2;
    if (s >= 40) return 1;
    return 0;
  }

  function clampInt(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ---------------- Motor expuesto ----------------
  const motor = {
    _modo: "demo",
    _ready: false,
    _fns: null,

    get modo() {
      return motor._modo;
    },
    get ready() {
      return motor._ready;
    },

    factorDemanda(libres, hora) {
      return motor._fns.factorDemanda(libres, hora);
    },
    factorClima(clima) {
      return motor._fns.factorClima(clima);
    },
    tarifaDinamica(base, precioKm, km, libres, clima, hora) {
      return motor._fns.tarifaDinamica(base, precioKm, km, libres, clima, hora);
    },
    scoreDesgaste(km, horas) {
      return motor._fns.scoreDesgaste(km, horas);
    },
    estadoMantenimiento(km, horas) {
      return motor._fns.estadoMantenimiento(km, horas);
    },

    // Estado legible para la vista Flota.
    mantenimientoLabel(km, horas) {
      const e = motor.estadoMantenimiento(km, horas);
      return e === 2 ? "Taller pronto" : e === 1 ? "Próximo" : "OK";
    },

    // Simulador de clima (sin BDD): pseudoaleatorio estable por dia.
    climaSimulado() {
      const dias = Math.floor(Date.now() / 86400000);
      const idx = ((dias % 32) * 7 + 3) % 4;
      return { code: idx, nombre: CLIMA_NOMBRES[idx] };
    },
  };

  // ---------------- Conectar WASM (si esta compilado) ----------------
  function wireWasm() {
    const asm = (typeof Module !== "undefined" && typeof Module.cwrap === "function")
      ? Module
      : null;
    if (!asm) return;

    const wrap = () => {
      try {
        motor._fns = {
          factorDemanda: asm.cwrap("factorDemanda", "number", ["number", "number"]),
          factorClima: asm.cwrap("factorClima", "number", ["number"]),
          tarifaDinamica: asm.cwrap("tarifaDinamica", "number",
            ["number", "number", "number", "number", "number", "number"]),
          scoreDesgaste: asm.cwrap("scoreDesgaste", "number", ["number", "number"]),
          estadoMantenimiento: asm.cwrap("estadoMantenimiento", "number", ["number", "number"]),
        };
        motor._modo = "wasm";
        motor._ready = true;
        console.info("[motor] Motor C++ activo via WebAssembly");
      } catch (e) {
        console.warn("[motor] No se pudo conectar WASM, usando demo: " + e);
      }
    };

    if (asm.calledRun || asm.ready) wrap();
    else asm.onRuntimeInitialized = wrap;
  }

  // Fallback demo: misma logica, replicada en JS.
  motor._fns = {
    factorDemanda: jsFactorDemanda,
    factorClima: jsFactorClima,
    tarifaDinamica: jsTarifaDinamica,
    scoreDesgaste: jsScoreDesgaste,
    estadoMantenimiento: jsEstadoMantenimiento,
  };

  // Intentar WASM cuando el documento termino de cargar el glue.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireWasm);
  } else {
    wireWasm();
  }

  ns.motor = motor;
})(window.MotoFlow);