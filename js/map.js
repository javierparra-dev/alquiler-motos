"use strict";

/* ------------------------------------------------------------------
   MotoFlow.map  ->  mapa Leaflet con calles reales (OpenStreetMap)
   - click en el mapa: fija Punto A y luego Punto B
   - "Simular viaje" traza la ruta con OSRM y anima la moto sobre ella
------------------------------------------------------------------- */

window.MotoFlow = window.MotoFlow || {};

(function (ns) {
  const MAP_OSM = {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    },
  };

  const OSRM_API = [
    "https://router.project-osrm.org/route/v1/driving/",
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
  ];

  const cityCenter = [-34.6037, -58.3816]; // Buenos Aires (cambiar si queres)
  const zoom = 13;

  const map = L.map("map").setView(cityCenter, zoom);
  L.tileLayer(MAP_OSM.url, MAP_OSM.options).addTo(map);

  const routeGroup = L.layerGroup().addTo(map);

  let pointA = null;
  let pointB = null;
  let markerA = null;
  let markerB = null;
  let motoMarker = null;
  let routeLine = null;
  let animRequest = null;

  const motoIcon = L.divIcon({
    className: "",
    html: '<div class="moto-marker">M</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  const pointLabel = (label) =>
    '<div class="moto-marker" style="width:26px;height:26px;font-size:12px;">' + label + "</div>";

  map.on("click", (e) => {
    // Con un viaje activo (ruta/resultado puesto), hay que limpiar primero.
    if (ns.isTripActive && ns.isTripActive()) {
      if (ns.onTripBlocked) ns.onTripBlocked();
      return;
    }

    if (!pointA) {
      setPointA(e.latlng);
    } else {
      setPointB(e.latlng);
    }
    ns.onPointsChanged();
  });

  function setPointA(latlng) {
    pointA = latlng;
    if (markerA) markerA.remove();
    markerA = L.marker(latlng, { icon: L.divIcon({ className: "", html: pointLabel("A"), iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
    ns.onPointUpdated("pickup", { latlng, label: "Buscando calle…" });
    resolveStreet(latlng, markerA, "pickup");
  }

  function setPointB(latlng) {
    pointB = latlng;
    if (markerB) markerB.remove();
    markerB = L.marker(latlng, { icon: L.divIcon({ className: "", html: pointLabel("B"), iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
    ns.onPointUpdated("dropoff", { latlng, label: "Buscando calle…" });
    resolveStreet(latlng, markerB, "dropoff");
  }

  // Geocodificacion inversa (Nominatim). La vista muestra el nombre de la
  // calle; el codigo sigue usando las coordenadas (latlng) para la ruta.
  const streetCache = {};

  async function reverseGeocode(latlng) {
    const key = latlng.lat.toFixed(5) + "," + latlng.lng.toFixed(5);
    if (key in streetCache) return streetCache[key];

    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1" +
      "&lat=" + latlng.lat + "&lon=" + latlng.lng;

    try {
      const res = await fetch(url, {
        headers: { "Accept-Language": "es" },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) throw new Error("geo " + res.status);
      const json = await res.json();
      const a = json.address || {};
      const road = a.road || a.pedestrian || a.footway || a.neighbourhood;
      const name = road || (json.display_name || "").split(",")[0] || null;
      streetCache[key] = name;
      return name;
    } catch (e) {
      streetCache[key] = null;
      return null;
    }
  }

  async function resolveStreet(latlng, marker, which) {
    const name = await reverseGeocode(latlng);
    const active = which === "pickup" ? pointA : pointB;
    if (!active) return;

    ns.onPointUpdated(which, {
      latlng,
      label: name || latlng.lat.toFixed(5) + ", " + latlng.lng.toFixed(5),
    });
    if (name && marker) {
      marker.bindTooltip(name, { direction: "top", offset: [0, -16] });
    }
  }

  function reset() {
    cancelAnimation();
    routeGroup.clearLayers();
    pointA = null;
    pointB = null;
    markerA = null;
    markerB = null;
    motoMarker = null;
    routeLine = null;
  }

  async function revealRoute() {
    if (!pointA || !pointB) return;

    cancelAnimation();
    routeGroup.clearLayers();

    const start = pointA.lng + "," + pointA.lat;
    const end = pointB.lng + "," + pointB.lat;

    let coords = null;
    let distance = 0;
    let duration = 0;

    coords = await tryRoutes(start, end);

    if (!coords) {
      // Fallback: linea recta interpolada (router no respondio)
      coords = straightLine(pointA, pointB, 60);
      distance = haversine(pointA, pointB);
      duration = distance / 40; // ~40 km/h promedio
    } else {
      const res = parseOsrm(coords);
      coords = res.coords;
      distance = res.distance;
      duration = res.duration;
    }

    const latlngs = coords.map((c) => [c[1], c[0]]);
    routeLine = L.polyline(latlngs, { color: "#00F5D4", weight: 4, opacity: 0.9 }).addTo(routeGroup);
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

    motoMarker = L.marker(latlngs[0], { icon: motoIcon }).addTo(routeGroup);
    animateAlong(latlngs, (6000 + duration * 900)); // mas cuentas largo, mas lento

    ns.onRouteResolved({
      distanceKm: distance / 1000,
      durationSec: duration,
      latlngs: latlngs,
    });
  }

  async function tryRoutes(start, end) {
    for (const base of OSRM_API) {
      try {
        const res = await fetch(
          base + start + ";" + end + "?overview=full&geometries=geojson",
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) continue;
        const json = await res.json();
        if (!json.routes || json.routes.length === 0) continue;
        return json;
      } catch (e) {
        // intentar con el siguiente proveedor
      }
    }
    return null;
  }

  function parseOsrm(json) {
    const r = json.routes[0];
    const coords = r.geometry.coordinates; // [ [lon,lat], ... ]
    return {
      coords,
      distance: r.distance, // metros
      duration: r.duration, // segundos
    };
  }

  function straightLine(a, b, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t]);
    }
    return pts;
  }

  function haversine(a, b) {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Anima la moto a lo largo de la ruta interpolando entre vertice y vertice
  function animateAlong(latlngs, totalMs) {
    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / totalMs);
      const p = t * (latlngs.length - 1);
      const i = Math.floor(p);
      const f = p - i;
      const a = latlngs[Math.min(i, latlngs.length - 1)];
      const b = latlngs[Math.min(i + 1, latlngs.length - 1)];
      const lat = a[0] + (b[0] - a[0]) * f;
      const lng = a[1] + (b[1] - a[1]) * f;

      motoMarker.setLatLng([lat, lng]);

      if (t < 1) {
        animRequest = requestAnimationFrame(step);
      } else {
        ns.onTripFinished();
      }
    };

    animRequest = requestAnimationFrame(step);
  }

  function cancelAnimation() {
    if (animRequest) {
      cancelAnimationFrame(animRequest);
      animRequest = null;
    }
  }

  ns.map = map;
  ns.revealRoute = revealRoute;
  ns.reset = reset;
  ns.hasRoute = () => Boolean(pointA && pointB);
})(window.MotoFlow);