# MotoFlow Optimizer

App web para administrar el alquiler de una flota de motos.
El backend es **PHP** y el cálculo pesado lo hace un motor en **C++**
que PHP invoca cuando necesita algo rápido.

## Stack

- **Frontend:** HTML, CSS y JavaScript (básico).
- **Backend:** PHP (rutas, sesiones, formularios).
- **Motor:** C++ compilado / WebAssembly (próximo paso).
- **Base de datos:** MySQL (o JSON/IndexedDB en la demo estática).

## Qué hace (o hará) el motor C++

- Rutas óptimas entre punto A y punto B.
- Tarifas según oferta/demanda y clima.
- Prioriza alquilar las motos más nuevas.
- Estima cuándo le toca mantenimiento a cada moto (km y horas de uso).

## Estado actual

Frontend funcionando con 5 vistas: **Mapa**, **Buscar moto**, **Mis viajes**,
**Flota** y **Acerca del proyecto**. Tema oscuro "Cyber-Tech".

- El **mapa** traza rutas reales (OpenStreetMap + OSRM) y simula la moto
  viajando de A a B.
- La **tarifa dinámica** todavía se calcula en JavaScript como demo.
  El motor en C++ (WASM) es el próximo paso.
- Los botones que no tienen lógica todavía muestran el aviso
  "En construcción : se habilita en próximas actualizaciones".

## Correr en local

Con Live Server en VS Code, o:

```bash
python -m http.server
```

y entrar a `http://localhost:8000`.

## Estructura

| Carpeta | Qué es |
| --- | --- |
| `index.html` | La página completa (menú + vistas). |
| `css/` | Estilo visual (tema oscuro). |
| `js/` | Lógica del mapa (map.js) y de la app (app.js). |
| `data/motos.json` | "Base de datos" simulada de la flota. |
| `wasm/src` y `wasm/out` | Fuente del motor C++ y su compilado (próximo). |
| `backend/` | Versión PHP para hosting con base de datos real (próximo). |
| `docs/` | Documentación en criollo de cada parte. |

## Demo en vivo

[Agrega acá tu enlace de GitHub Pages o Render/Railway]

## Licencia

MIT