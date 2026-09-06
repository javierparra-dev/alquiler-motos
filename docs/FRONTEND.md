# La pantalla y los botones (en criollo)
Es para entender la parte visual del proyecto: la pantalla de entrada,
las distintas vistas, el mapa y los botones.

---

## 1. La pantalla de entrada (la "landing")

Cuando abrís la página, aparece la **landing** (pantalla de bienvenida que
baja con scroll). Está ordenada en bloques, en criollo:

1. **Barra de navegación pegajosa:** el logo a la izquierda, los accesos
   **HOME · MOTOS · QUIÉNES SOMOS · CALCULAR** (te llevan directo a cada
   sección con scroll suave, sin recargar), el indicador **"Argentina"**
   al centro (por ahora solo cobertura nacional) y el botón neón
   **"Alquilar ahora"** a la derecha (todavía no alquila: muestra
   "En construcción").
2. **Título grande:** "Rent a Scooter & Motorbike".
3. **Widget de reserva:** un contenedor horizontal con
   - **Pick-up / Locación:** selector de dónde retirás la moto
     (ciudades argentinas).
   - **"Diferente locación de devolución":** botón que despliega un
     segundo selector si lo tocás.
   - **Fechas:** inicio y fin (por defecto hoy y pasado mañana).
   - **Sliders de hora:** entrega y devolución, en pasos de media hora.
   - **Botón SEARCH:** el neón grande. Muestra un spinner un segundo y
     entra a la app abriendo el **mapa**.
4. **Filtros de categoría:** pastillas que se **generan solas desde los
   datos** del catálogo (siempre "Todas" + las categorías reales). Hoy:
   [Todas] [Scooters]. Si mañana hay deportivas o eléctricas, aparecen
   solas. La activa tiene fondo neón y filtra la grilla al instante.
5. **Catálogo de flota:** grilla de tarjetas con la **foto real de AWS S3**
   (PNG transparente, con zoom suave al pasar el cursor), nombre, precio
   por día en **pesos argentinos**, estado "Disponible" y botón
   **Alquilar** (muestra "En construcción"). Si una foto no carga, queda
   el slot de respaldo.
6. **Locaciones:** dos filas asimétricas (texto corto + imagen cuadrada,
   que hoy es un slot): **Buenos Aires** y **Córdoba**, con botón
   "Explorar zona" ("En construcción").
7. **Calculadora de tarifas:** elegís la moto y recalculás sola según las
   fechas: días, **factor demanda** (motos libres + hora) y **factor
   clima**, precio base, impuestos (21%) y el total en `#precio-final`,
   todo en pesos argentinos y calculado por el **motor C++**. El clima
   sigue siendo simulado por día (falta la base de datos).

> La landing es la "vidriera". El mapa y las vistas de la app aparecen al
> tocar SEARCH o el logo.

---

## 2. La barra superior (la "navbar")

Una vez adentro, ves una barra negra azulada arriba con los accesos:

**Mapa** · **Buscar moto** · **Mis viajes** · **Flota** · **Acerca**

- Hacer click en cada acceso cambia la vista.
- El logo (a la izquierda) te vuelve al menú de entrada.

Entre la navbar y el pie de página están las cinco vistas.

---

## 3. La vista Mapa

Es un mapa de calles reales (como Google Maps pero gratuito). Muestra
Buenos Aires y sus calles de verdad.

### Qué podés hacer en el mapa

- **Hacer click dos veces.** El primer click marca el **Punto A**
  (donde se sube a la moto). El segundo click marca el **Punto B**
  (donde se la deja).
- Al marcar los dos puntos, el mapa dibuja la **ruta** siguiendo las
  calles.
- Después, una **motito** (la letra "M" en un círculo neón) recorre esa
  ruta sola, como si estuviera viajando. Esa es la "simulación".

> Dato 1: el mapa siempre guarda las **coordenadas** (eso es lo que usa el
> código para pedir la ruta y calcular la tarifa). El **nombre de la calle**
> que ves es solo la vista, para que sea más lindo.
>
> Dato 2: la ruta y el nombre de calle se piden a servicios gratuitos
> (OSRM y Nominatim). Si alguno no responde, el mapa dibuja una línea recta
> o muestra la coordenada, así la demo igual funciona.

### El panel "Simular viaje"

Es la caja oscura arriba a la izquierda del mapa:

| Elemento | Qué hace |
| --- | --- |
| **Punto A (origen)** | Cuando tocás el mapa la primera vez, acá aparece el **nombre de la calle** donde tocaste (vía OpenStreetMap). Si el servicio no responde, queda la coordenada como respaldo. |
| **Punto B (destino)** | Con el segundo click, lo mismo para la calle de llegada. |
| **Moto** | Un menú donde elegís qué moto alquilar. Cada una tiene su precio por kilómetro. |
| **Botón "Simular viaje"** | El botón neón. Traza la ruta y hace que la moto la recorra. También muestra el precio final. |
| **Botón "Limpiar"** | Borra todo: puntos, ruta y datos del viaje. Además, después de un viaje **es obligatorio** para poder cargar otro: mientras hay un viaje activo el mapa ignora los clicks, te avisa y el botón **late** en neón. |

### La tarjeta de resultado

Cuando la ruta termina, abajo del panel aparece el resultado del viaje:

- **Distancia:** cuántos kilómetros son de A a B.
- **Duración:** cuántos minutos y segundos tardaría.
- **Factor demanda:** sube el precio si hay pocas motos libres (usea el
  stock real de la flota y la hora actual).
- **Factor clima:** si está lloviendo o con tormenta, el precio sube.
- **Motor:** te dice si el cálculo lo hizo el motor C++ real (WASM) o la
  réplica en JavaScript (modo demo, por si no compilaste el `.wasm`).
- **Total:** el precio final en pesos.

> Esos cálculos los hace el **motor en C++** (`wasm/src/motor.cpp`), que es
> el corazón del proyecto. Si el `.wasm` está compilado, corre la lógica
> real; si no, `js/motor.js` replica el mismo algoritmo en JavaScript para
> que la demo no se rompa. El clima es simulada por día, sin base de datos
> todavía.

---

## 4. La vista Buscar moto

Una grilla con las motos de la flota. Cada tarjeta muestra:

- Nombre y tipo de moto.
- Estado: **Disponible** (neón) o **No disponible**.
- Kilometraje y horas de uso.
- Precio por kilómetro.
- Botón **Alquilar ahora** (neón) o **No disponible** (apagado).

> El botón "Alquilar ahora" todavía no alquila nada: al apretarlo sale
> el aviso "En construcción".

---

## 5. La vista Mis viajes

Estado vacío: "Aún no tenés viajes". Solo tiene el botón **Crear viaje**,
que por ahora también muestra el aviso "En construcción".

---

## 6. La vista Flota

Una tabla con el estado de cada moto:

- Kilometraje y horas de uso.
- Disponibilidad.
- **Mantenimiento:** sale del motor C++ por desgaste (km y horas de uso):
  "OK", "Próximo" o "Taller pronto".
- Botón **Programar taller** (por ahora, "En construcción").

---

## 7. La vista Acerca del proyecto

Explica el stack: frontend, backend PHP, el motor C++ (con los
algoritmos previstos) y cómo se piensan conectar los datos.

---

## 8. El aviso "En construcción"

Todos los botones que todavía no funcionan muestran el mismo aviso al
final de la pantalla:

> **En construcción : se habilita en próximas actualizaciones**

Es a propósito: así se ve qué está "vivo" (el mapa y la tarifa del motor
C++) y qué es placeholder para próximos pasos.

---

## Cómo se conecta todo (sin tecnicismos)

1. Tocás el mapa → JavaScript guarda las **coordenadas** del Punto A y el
   Punto B (y en la vista se muestra el **nombre de la calle**).
2. Apretás **Simular viaje** → el código sale a pedir la ruta por
   internet (OSRM) y la dibuja en el mapa.
3. La tarifa la calcula el **motor C++** (WASM si está compilado, o la
   réplica en JavaScript): multiplica la base por los factores de demanda
   y clima y te muestra el total.

Todo pasa en el navegador del visitante, sin instalar nada. Por eso se
puede subir gratis a GitHub Pages (si querés que ahí corra el motor C++
real, subí también el `.wasm`; para eso está en `docs/MOTOR.md`).

## Las fotos (AWS S3)

Las imágenes del catálogo viven en un bucket público de **Amazon S3**
(`alquiler-motos-assets`, región `sa-east-1`), con lectura pública y sin
APIs. La URL de cada moto está guardada en el campo `imagen` de
`data/motos.json`:

```
https://alquiler-motos-assets.s3.sa-east-1.amazonaws.com/images/{nombre}.png
```

- La landing las carga con `<img loading="lazy">` (PNG transparente con
  `object-contain`, zoom suave al pasar el cursor).
- Si la URL no carga o no existe, automáticamente se muestra el **slot de
  respaldo** ("Slot de imagen").
- Las imágenes de las secciones de **locaciones** todavía no se subieron:
  por eso ahí el slot queda fijo.

---

## Archivos de esta parte

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página completa: landing, navbar, las 5 vistas y el pie. |
| `css/styles.css` | El estilo visual (tema oscuro "Cyber-Tech"). |
| `js/landing.js` | La landing: catálogo, filtros, widget de reserva y calculadora. |
| `js/map.js` | Todo lo del mapa: puntos, ruta y la moto que viaja. |
| `js/app.js` | Cambio de vistas, botones, lista de motos, tarifa y flota. |
| `js/motor.js` | Puente al motor C++: usa el WASM si está, si no replica en JS. |
| `wasm/src/motor.cpp` | El algoritmo en C++ (tarifa + mantenimiento). |
| `build.bat` | Compila el motor (g++ para test + Emscripten para WASM). |
| `data/motos.json` | La "base de datos" simulada de las motos disponibles. |

---

## Si algo no funciona

- El mapa queda gris / sin calles: revisa que el proyecto se esté
  sirviendo por internet local (Live Server) y no abierto como archivo
  directo.
- La moto no se mueve: fijate que marcaste Punto A y Punto B antes de
  apretar "Simular viaje".
- El precio no aparece: puede ser que la lista de motos no haya
  cargado. Recargá la página.
- El panel muestra "motor C++ (demo, sin WASM)": es normal si todavía no
  compilaste el `.wasm` con `build.bat`; el resultado es el mismo (mismo
  algoritmo) pero replicado en JavaScript.
- Al apretar un botón no pasa nada: es normal si es un botón "en
  construcción" — debería salir el aviso al final de la pantalla.