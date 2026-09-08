# API MotoFlow (PHP + MySQL)

Backend REST por ahora sin login (todo criollo y simple). Solo GET y POST,
siempre responde `application/json; charset=utf-8`.

## Dónde vive

- Código: `backend/src/` (config, PDO, helpers) y `backend/public/api/` (endpoints).
- En producción la API vive en **https://motoflow.duckdns.org/api/** (EC2 + DuckDNS +
  HTTPS con Certbot) — mismo origen que la app, sin CORS raro.
- El frontend la detecta sola (`js/api.js`): si `api/index.php` responde, usa
  MySQL; si no (GitHub Pages), cae a `data/motos.json` sin romperse.

## Puesta en marcha

En tu máquina, solo necesitás:

1. Copiar `backend/src/config.example.php` a `backend/src/config.php` y
   completar host/puerto/`db_name`/`db_user`/`db_pass`. `config.php` está en
   `.gitignore`, **no se sube al repo** (el script de EC2 lo genera solo).
2. Correr `php backend/install.php` (crea las tablas y siembra las motos
   desde `data/motos.json` si la tabla está vacía).
   - `php backend/install.php --force` borra todo y resiembra.
   - Si la base **ya existía**, el install corre las **migraciones**
     idempotentes: agrega columnas/tablas nuevas sin tocar lo que ya había
     (ej. `motos.descripcion` y las tablas del módulo de reservas).
3. Servir la carpeta `backend/public/api/` (Apache `Alias /api`, o `php -S`).

## Endpoints

### GET `/api/index.php`

Health check.

```json
{ "app": "MotoFlow API", "status": "ok", "version": "1" }
```

### GET `/api/motos.php`

Lista las motos (se siembran desde `data/motos.json` en el install).

```json
{ "motos": [ { "id": 1, "nombre": "Honda CG 160", "tipo": "city",
  "categoria": "scooter", "descripcion": "La clásica urbana...",
  "precio_base": "3.00", "precio_km": "0.45",
  "precio_dia": "12.50", "km": 8400, "horas_uso": 320,
  "disponible": 1, "imagen": "https://..." } ] }
```

- `GET /api/motos.php?id=3` → `{ "moto": { ... } }` (404 si no existe).

Los decimales de la base vienen como string (`"0.45"`); el front ya
convierte con `Number()`.

### POST `/api/viajes.php`

Crea un viaje. El payload es exactamente el que arma `js/app.js` al tocar
**Guardar en Mis viajes**:

```json
{
  "moto_id": 1,
  "origen_calle": "Av. Corrientes",
  "destino_calle": "Palermo",
  "origen_lat": -34.6037, "origen_lng": -58.3816,
  "destino_lat": -34.588, "destino_lng": -58.430,
  "distancia_km": 6.42,
  "duracion_seg": 840,
  "tarifa": 11147.5,
  "factor_demanda": 1.35,
  "factor_clima": 1.0,
  "clima_nombre": "Soleado"
}
```

- Requerido: `moto_id`. El resto es opcional (las calles pueden quedar
  `null` si todavía se estaba buscando la dirección).
- Responde `201` con `{ "ok": true, "id": 5 }`, o `400` con `{ "error": "..." }`.

### GET `/api/viajes.php`

Historial completo (`ORDER BY id DESC`), con el nombre de la moto resuelto:

```json
{ "viajes": [ { "id": 5, "moto_id": 1, "moto_nombre": "Honda CG 160",
  "origen_calle": "Av. Corrientes", "destino_calle": "Palermo",
  "distancia_km": "6.42", "duracion_seg": 840, "tarifa": "11147.50",
  "factor_demanda": "1.35", "factor_clima": "1.00", "clima_nombre": "Soleado",
  "creado_en": "2026-09-06 20:41:00" } ] }
```

### GET/POST `/api/usuarios.php`

Mínimo: `POST` con `nombre` (obligatorio) y `email` (validado), `telefono`
opcional. `GET` lista, `GET ?id=` trae uno. Todavía no lo usa el front
(queda para el login/crear usuario del próximo paso).

## Esquema

| Tabla | Columnas claves |
| --- | --- |
| `motos` | id, nombre, tipo, categoria, **descripcion**, precio_base, precio_km, precio_dia, km, horas_uso, disponible, imagen |
| `usuarios` | id, nombre, email, telefono, creado_en |
| `viajes` | id, usuario_id (nullable), moto_id (FK), origen/destino calles+coords, distancia_km, duracion_seg, tarifa, factor_demanda, factor_clima, clima_nombre, creado_en |
| `locaciones` | id, nombre, direccion, lat, lng, horario, activa — puntos fijos de retiro/devolución (seed antigua: 8 estaciones CABA/GBA) |
| `accesorios` | id, nombre, precio_dia, visible (seed: casco, guantes, candado, GPS, seguro, funda) |
| `motos_x_accesorios` | tabla puente N:M (moto_id, accesorio_id, PK compuesta) |
| `reservas` | id, usuario_id (nullable), moto_id (FK), locacion_retiro/devolucion (FK a locaciones), cantidad, fecha_inicio/fin, precio_unitario, subtotal, estado ENUM('pendiente','confirmada','activa','finalizada','cancelada'), creado_en |
| `reservas_x_accesorios` | N:M reserva↔accesorio con cantidad (PK compuesta) |
| `mantenimientos` | id, moto_id (FK), fecha, tipo, costo, taller |
| `pagos` | id, reserva_id (FK), metodo, monto, estado ENUM('pendiente','acreditado','rechazado'), creado_en |

> El módulo de reservas (locaciones/accesorios/reservas/mantenimientos/pagos)
> ya queda creado y sembrado por el install, pero el front todavía no lo usa:
> se va a habilitar cuando el checkout pase de "En construcción" a crear
> reservas reales + elegir punto de retiro en el mapa.

## Notas

- Sin auth: la app es una demo y el frontend vive en el mismo origen, así que
  una API key no aporta (la clave sería visible en el JS de todas formas). La
  protección elegida es **HTTPS**: cerá 443 con `certbot --apache` para el
  dominio y todo viaja cifrado.
- Probar la API viva: `curl https://motoflow.duckdns.org/api/motos.php`.
- Actualizar el código desplegado: el servidor sirve un clone del repo, así
  que tras un push hay que `cd /var/www/motoflow && sudo git pull` en EC2
  (Apache sirve directo, no hay build).
- CORS habilitado en `helpers.php` por si algún día se sirve la API en otro
  origen, pero en EC2 no hace falta (mismo origen).
- `config.php` con `CAMBIAME` tira error 500 con mensaje claro (no se puede
  conectar sin config).