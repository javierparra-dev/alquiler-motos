# La pantalla y los botones (en criollo)
Es para entender la parte visual del proyecto: la pantalla de entrada,
las distintas vistas, el mapa y los botones.

---

## 1. La pantalla de entrada (la "landing")

Cuando abrís la página, aparece la **landing** (pantalla de bienvenida que
baja con scroll). Está ordenada en bloques, en criollo:

1. **Barra de navegación pegajosa:** logo a la izquierda, un selector de
   país al centro y el botón neón **"Alquilar ahora"** a la derecha
   (todavía no alquila: muestra "En construcción").
2. **Título grande:** "Rent a Scooter & Motorbike".
3. **Widget de reserva:** un contenedor horizontal con
   - **Pick-up / Locación:** selector de dónde retirás la moto.
   - **"Diferente locación de devolución":** botón que despliega un
     segundo selector si lo tocás.
   - **Fechas:** inicio y fin (por defecto hoy y pasado mañana).
   - **Sliders de hora:** entrega y devolución, en pasos de media hora.
   - **Botón SEARCH:** el neón grande. Muestra un spinner un segundo y
     entra a la app abriendo el **mapa**.
4. **Filtros de categoría:** pastillas [Todas] [Scooters] [Deportivas]
   [Eléctricas]. La activa tiene fondo neón; filtra la grilla al instante.
5. **Catálogo de flota:** grilla de tarjetas con el slot de imagen (todavía
   sin foto, se ve "Slot de imagen"), nombre, precio por día, estado
   "Disponible" y botón **Alquilar** (muestra "En construcción").
6. **Locaciones:** dos filas asimétricas (texto corto + imagen cuadrada,
   que hoy es un slot), con botón "Explorar zona" ("En construcción").
7. **Calculadora de tarifas:** elegís la moto y recalculás sola según las
   fechas: días, precio base, impuestos (21%) y el total en `#precio-final`.

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

> Dato: la ruta se pide a un servicio gratuito que se llama OSRM.
> Si ese servicio no responde, el mapa dibuja una línea recta entre los
> dos puntos para que la demo igual funcione.

### El panel "Simular viaje"

Es la caja oscura arriba a la izquierda del mapa:

| Elemento | Qué hace |
| --- | --- |
| **Punto A (origen)** | Cuando tocás el mapa la primera vez, acá aparece la coordenada del punto de salida. Se llena solo. |
| **Punto B (destino)** | Con el segundo click, acá aparece el punto de llegada. También solo. |
| **Moto** | Un menú donde elegís qué moto alquilar. Cada una tiene su precio por kilómetro. |
| **Botón "Simular viaje"** | El botón neón. Traza la ruta y hace que la moto la recorra. También muestra el precio final. |
| **Botón "Limpiar"** | Borra todo: puntos, ruta y datos del viaje. Para empezar de nuevo. |

### La tarjeta de resultado

Cuando la ruta termina, abajo del panel aparece el resultado del viaje:

- **Distancia:** cuántos kilómetros son de A a B.
- **Duración:** cuántos minutos y segundos tardaría.
- **Factor demanda:** un número que sube el precio si hay poco stock.
- **Factor clima:** si está lloviendo, el precio sube un poco.
- **Total:** el precio final en pesos.

> Importante: hoy ese cálculo lo hace JavaScript (el "lenguaje de la
> página"). Es de mentira a propósito. Más adelante ese mismo cálculo lo
> va a hacer el motor en C++, que es el corazón del proyecto.

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
- **Mantenimiento:** "OK" o "Taller pronto" (si supera los 12.000 km).
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

Es a propósito: así se ve qué está "vivo" (el mapa y la tarifa demo) y
qué es placeholder para próximos pasos.

---

## Cómo se conecta todo (sin tecnicismos)

1. Tocás el mapa → JavaScript guarda el Punto A y el Punto B.
2. Apretás **Simular viaje** → el código sale a pedir la ruta por
   internet (OSRM) y la dibuja en el mapa.
3. La misma página calcula la tarifa (por ahora, demo) y la muestra.

Todo pasa en el navegador del visitante, sin instalar nada. Por eso se
puede subir gratis a GitHub Pages.

---

## Archivos de esta parte

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página completa: landing, navbar, las 5 vistas y el pie. |
| `css/styles.css` | El estilo visual (tema oscuro "Cyber-Tech"). |
| `js/landing.js` | La landing: catálogo, filtros, widget de reserva y calculadora. |
| `js/map.js` | Todo lo del mapa: puntos, ruta y la moto que viaja. |
| `js/app.js` | Cambio de vistas, botones, lista de motos y la tarifa demo. |
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
- Al apretar un botón no pasa nada: es normal si es un botón "en
  construcción" — debería salir el aviso al final de la pantalla.