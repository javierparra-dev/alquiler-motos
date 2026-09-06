# El motor C++ (en criollo)

Es el "cerebro pesado" del proyecto. La parte visual corre en el navegador
(HTML/CSS/JS) y el **cálculo vive en C++**, pero compilado a un formato que
el navegador puede ejecutar sin instalar nada: **WebAssembly (WASM)**.

---
## Por qué dos compiladores (y cuál para qué)

- **`g++`** es el compilador de C++ común. Genera un `.exe`, es decir un
  programa de Windows. El navegador **no puede ejecutar** un `.exe` ajeno
  (sería un riesgo de seguridad). Lo usamos para **probar el algoritmo en
  tu PC**, rápido y sin instalar nada extra.
- **Emscripten (`emcc`)** es un compilador distinto del mismo C++: genera
  un archivo **`.wasm`** (WebAssembly). Ese archivo **sí lo puede ejecutar
  el navegador** de cualquier visitante, sin instalar nada. Es la versión
  "de producción" del motor.

```
motor.cpp →  g++  →  build/motor_cli.exe   (probás en tu PC)
motor.cpp →  emcc →  wasm/out/motor.wasm   (corre en la web)
```

## Qué calcula hoy

### 1. Tarifa dinámica

Precio = `(base + km × precio_km) × factor_demanda × factor_clima`

**Factor demanda** (oferta real: cuántas motos están libres + hora del día):

| Condición | Multiplicador |
| --- | --- |
| Menos de 3 motos libres | **x1.50** |
| Entre 3 y 6 motos libres | **x1.25** |
| Más de 6 motos libres | x1.00 |
| Hora pico (07–10 o 17–21) | +0.15 |

**Factor clima**:

| Clima | Multiplicador |
| --- | --- |
| Soleado | x1.00 |
| Nublado | x1.10 |
| Lluvia | x1.30 |
| Tormenta | x1.50 |

### 2. Mantenimiento (desgaste)

Cada moto tiene un puntaje de desgaste de 0 a 100, calculado así:

```
desgaste = 50 × (km / 30.000) + 50 × (horas_de_uso / 1.000)
```

- 0 a 39 → **OK** (estado 0)
- 40 a 69 → **Próximo** (estado 1)
- 70 a 100 → **Taller pronto** (estado 2)

> Los números (constantes) viven arriba del archivo `wasm/src/motor.cpp`
> y se pueden ajustar cuando el negocio tenga datos reales.

## Dónde lo usa la app

| Lugar | Qué se conecta |
| --- | --- |
| Mapa (panel "Simular viaje") | Tarifa dinámica + el multiplicador de demanda (con las **motos libres reales** de la flota y la **hora actual**). |
| Landing (calculadora) | Mismo motor: filas "Factor demanda" y "Factor clima" antes del precio base. |
| Vista **Flota** | La columna "Mantenimiento" (OK / Próximo / Taller pronto) sale del algoritmo de desgaste. |

El clima todavía es **simulado por día** (cambia de forma estable cada
día, para no romper la demo). Cuando haya backend, va a venir de una API
climática real. Por eso el usuario no eligió una base de datos todavía:
los datos siguen en `data/motos.json`.

## Compilar

### Paso 1: prueba en tu PC (g++)

```bat
build.bat
```

Esto primero compila `build/motor_cli.exe` (si tenés MinGW instalado) y
después intenta el WASM. Probar el CLI:

```bat
build\motor_cli.exe 3500 280 12 4 2 10 850 40
```

Argumentos: `base`, `precio_km`, `km_ruta`, `motosLibres`, `clima (0-3)`,
`hora (0-23)` y opcionales `km_moto`, `horasUso`.

### Paso 2: WebAssembly (Emscripten)

Necesitás instalar **Emscripten una vez** (descarga grande, ~1 GB):

1. Seguí los pasos de https://emscripten.org/docs/getting_started/downloads.html
2. Al final tenés que poder escribir `emcc` en la consola.
3. Volvé a correr `build.bat`.

Cuando compila, genera `wasm/out/motor.js` + `wasm/out/motor.wasm`.

## Qué pasa si el `.wasm` no está compilado

**La app no se rompe.** `js/motor.js` es el puente:

- Si `wasm/out/motor.js` existe y carga → usa las funciones **reales de
  C++** (modo `wasm`).
- Si no → replica el **mismo algoritmo en JavaScript** (modo `demo`) para
  que la demo siga andando.

En el mapa, la fila "Motor" te dice cuál de los dos está activo.
Los algoritmos son idénticos en ambos, así que el resultado no cambia.

## El motor y el PHP (próximo paso)

Cuando exista el backend, PHP no va a hablar con el navegador: va a recibir
los pedidos, y para el cálculo pesado va a correr ese mismo `motor.cpp`
compilado como ejecutable (o compartir el mismo algoritmo). Así el motor
queda en el centro: **C++ en el navegador (WASM) y C++ en el servidor
(ejecutable).**

## Archivos de esta parte

| Archivo | Qué es |
| --- | --- |
| `wasm/src/motor.cpp` | El algoritmo en C++ (tarifa + mantenimiento), con un `main` de prueba para g++. |
| `build.bat` | Compila el CLI con g++ y el WASM con Emscripten. |
| `js/motor.js` | Puente hacia el motor: usa WASM si está, si no replica en JS. |
| `wasm/out/` | Donde queda el compilado (`.wasm` ignorado por git, el `.js` del glue se puede commitear). |

> Para que la demo en GitHub Pages use la versión WASM, hay que subir
> también el `.wasm` (git lo ignora por tamaño). Se puede forzar con
> `git add -f wasm/out/motor.wasm`.