"use strict";

/* ------------------------------------------------------------------
   MotoFlow.api -> puente hacia el backend PHP (MySQL)
   - Detecta si la API responde en el mismo origen (/api/...).
   - Si no (GitHub Pages, sin PHP), cae a data/motos.json.
   - La demo nunca se rompe.
------------------------------------------------------------------ */

window.MotoFlow = window.MotoFlow || {};

(function (ns) {
  const API = "api/";
  let available = null; // null = sin probar todavia

  async function probe() {
    try {
      const res = await fetch(API + "index.php", { signal: AbortSignal.timeout(6000) });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  const api = {
    async isAvailable() {
      if (available === null) available = await probe();
      return available;
    },

    // Motos: API real si hay backend, si no data/motos.json.
    async fetchMotos() {
      if (await api.isAvailable()) {
        try {
          const res = await fetch(API + "motos.php");
          if (!res.ok) throw new Error("api " + res.status);
          const json = await res.json();
          if (json.motos) return json.motos;
        } catch (e) {
          // caemos al JSON local
        }
      }
      const res = await fetch("data/motos.json");
      const json = await res.json();
      return json.motos;
    },

    async createViaje(v) {
      const res = await fetch(API + "viajes.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "no se pudo guardar");
      return json;
    },

    async listViajes() {
      const res = await fetch(API + "viajes.php");
      const json = await res.json();
      return json.viajes || [];
    },
  };

  ns.api = api;
})(window.MotoFlow);