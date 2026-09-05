# El mapa y los botones (en criollo)
Es para entender la parte visual del proyecto: donde esta el mapa, que
hacen los botones y como se conecta todo.

---

## La pantalla se divide en dos

La pagina tiene dos zonas grandes:

1. **El mapa** (la parte mas grande, a la derecha).
2. **El panel** (la cartita blanca a la izquierda, arriba del mapa).

---

## El mapa

Es un mapa de calles reales (como Google Maps pero gratuito). No es un
dibujo inventado: muestra Buenos Aires y sus calles de verdad.

### Que podes hacer en el mapa

- **Hacer click dos veces.** El primer click marca el **Punto A**
  (donde se sube a la moto). El segundo click marca el **Punto B**
  (donde se la deja).
- Al marcar los dos puntos, el mapa dibuja la **ruta** que tendria que
  seguir una moto entre esos dos lugares, siguiendo las calles.
- Despues, una **motito** (la letra "M" en un punto naranja) recorre esa
  ruta sola, como si estuviera viajando. Eso es la "simulacion".

> Dato: la ruta se pide a un servicio gratuito que se llama OSRM.
> Si ese servicio no responde, el mapa dibuja una linea recta entre los
> dos puntos para que la demo igual funcione.

---

## El panel

Es la cajita blanca con el titulo "Simular viaje". Tiene estos elementos:

| Elemento | Que hace |
| --- | --- |
| **Punto A (origen)** | Cuando tocas el mapa por primera vez, aca aparece la direccion del punto de salida. No lo escribis vos: se llena solo. |
| **Punto B (destino)** | Cuando tocas el mapa por segunda vez, aca aparece la direccion de llegada. Tambien se llena solo. |
| **Moto** | Un menu donde elegis que moto alquilar. Cada una tiene su precio por kilometraje. |
| **Boton "Simular viaje"** | El boton naranja. Traza la ruta y hace que la moto la recorra. Tambien muestra el precio final. |
| **Boton "Limpiar"** | Borra todo: los puntos, la ruta y los datos del viaje. Para empezar de nuevo. |

---

## La tarjeta de resultado

Cuando la ruta termina, abajo del panel aparece el resultado del viaje:

- **Distancia:** cuantos kilometros son de A a B.
- **Duracion:** cuantos minutos y segundos tardaria.
- **Factor demanda:** un numero que sube el precio si hay poco stock.
- **Factor clima:** si esta lloviendo, el precio sube un poco.
- **Total:** el precio final en pesos.

> Importante: hoy ese calculo lo hace JavaScript (el "lenguaje de la
> pagina"). Eso es de mentira a proposito. Mas adelante ese mismo calculo
> lo va a hacer el motor en C++, que es el corazon del proyecto.

---

## Como se conecta todo (sin tecnicismos)

1. Vos tocas el mapa.
2. JavaScript (el codigo que corre en el navegador) guarda los puntos.
3. Cuando apretas "Simular viaje", el codigo sale a pedir la ruta por
   internet (OSRM) y la dibuja en el mapa.
4. La misma pagina calcula la tarifa y la muestra en el panel.

Todo esto pasa en el navegador del visitante, sin necesidad de tener
installado nada en la compu. Por eso se puede subir gratis a GitHub Pages.

---

## Archivos de esta parte

| Archivo | Que es |
| --- | --- |
| `index.html` | La pagina completa: el mapa y el panel estan aca. |
| `css/styles.css` | Los colores, tamanos y el estilo visual. |
| `js/map.js` | Todo lo del mapa: puntos, ruta y la moto que viaja. |
| `js/app.js` | Los botones, la lista de motos y el calculo de la tarifa. |
| `data/motos.json` | La "base de datos" simulada de las motos disponibles. |

---

## Si algo no funciona

- El mapa queda gris / sin calles: revisa que el proyecto se este
  sirviendo por internet local (Live Server) y no abierto como archivo
  directo.
- La moto no se mueve: fijate que marcaste Punto A y Punto B antes de
  apretar "Simular viaje".
- El precio no aparece: puede ser que la lista de motos no haya
  cargado. Recarga la pagina.