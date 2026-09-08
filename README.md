# MotoFlow Optimizer

App web para administrar el alquiler de una flota de motos. Backend en **PHP**
con un motor de cálculo en **C++** (rutas, tarifas dinámicas y mantenimiento).
Frontend simple con **HTML**, **CSS** y **JavaScript**, DB en **MySQL**. Demo
incluida.

## Stack

- **Frontend:** HTML, CSS y JavaScript (básico).
- **Backend:** PHP (rutas, sesiones, formularios).
- **Motor:** C++ compilado a WebAssembly con Emscripten (`motor.cpp`).
- **Base de datos:** MySQL (o JSON/IndexedDB en la demo estática).

## Qué hace el motor C++

- Tarifas dinámicas según oferta/demanda y clima (activo en el mapa y en la
  calculadora de la landing).
- Estima el mantenimiento de cada moto por desgaste (km y horas de uso),
  visible en la vista **Flota**.
- Rutas óptimas entre punto A y punto B y priorización de motos nuevas:
  próximos pasos.

## Estado actual

Landing de entrada estilo Bikago (widget de reserva, filtros y catálogo de
la flota Yamaha con fotos desde AWS S3, locaciones y calculadora en pesos
argentinos) y una app con 5 vistas: **Mapa**, **Buscar moto**,
**Mis viajes**, **Flota** y **Acerca del proyecto**. Tema oscuro "Cyber-Tech".
Cobertura por ahora solo Argentina.

- El **mapa** traza rutas reales (OpenStreetMap + OSRM) y simula la moto
  viajando de A a B.
- La **tarifa dinámica** la calcula el **motor C++**: si compilaste el
  `.wasm` con `build.bat` (Emscripten) usa la versión real de C++; si no,
  `js/motor.js` replica el mismo algoritmo en JS (modo demo) para que nada
  se rompa.
- El **clima** es simulado por día y la **demanda** usa las motos libres
  reales de la flota + la hora actual.
- Los botones que no tienen lógica todavía muestran el aviso
  "En construcción : se habilita en próximas actualizaciones".
- **Alquilar** en la landing o en "Buscar moto" abre el **Facturador** en una
  **página aparte** (`facturador.html?moto=ID`): foto + descripción de la
  moto, tabla de datos, cantidad de motos (1–5), días (1–30) y el total en
  pesos (precio/día × cantidad × días). Al no cargar el mapa es liviana y
  veloz. "Confirmar alquiler" se habilita en la próxima fase (reservas +
  punto de retiro en el mapa).
- La app **detecta el backend** automáticamente: si corre con PHP + MySQL,
  las motos salen de la base real, se puede **guardar cada viaje** en
  "Mis viajes" y **Alquilar** desde "Buscar moto". Si no (GitHub Pages),
  usa `data/motos.json` como demo sin romperse.

## Compilar el motor

```bat
build.bat
```

- Compila `build/motor_cli.exe` con g++ (probar el algoritmo en consola) y
- genera `wasm/out/motor.js` + `.wasm` con Emscripten (para la web).

Detalle del algoritmo y Emscripten en [`docs/MOTOR.md`](docs/MOTOR.md).

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
| `js/` | Lógica de la landing (landing.js), del mapa (map.js), de la app (app.js), del puente al motor (motor.js) y de la API (api.js). |
| `data/motos.json` | Flota simulada (Yamaha) con precios ARS y URLs de imagen (S3). |
| `wasm/src` y `wasm/out` | Fuente del motor C++ (`motor.cpp`) y su compilado. |
| `build.bat` | Compila el motor (g++ para test local + Emscripten para WASM). |
| `backend/` | Backend PHP + MySQL: config, conexión PDO y endpoints REST en `backend/public/api/`. Detalle en `docs/API.md`. |
| `deploy/` | Script de despliegue para hostear la app completa en AWS EC2 (`ec2-setup.sh`). |
| `docs/` | Documentación en criollo de cada parte (ver `docs/MOTOR.md`). |

## App en producción

https://motoflow.duckdns.org/

API y contrato JSON en [`docs/API.md`](docs/API.md).

## Demo en vivo

https://javierparra-dev.github.io/alquiler-motos/

> La publica GitHub Pages con un workflow que compila el motor C++ a
> WebAssembly en cada push (`.github/workflows/pages.yml`).

## Licencia

MIT