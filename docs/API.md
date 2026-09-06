# API MotoFlow (PHP + MySQL)

Backend REST por ahora sin login (todo criollo y simple). Solo GET y POST,
siempre responde `application/json; charset=utf-8`.

## Dónde vive

- Código: `backend/src/` (config, PDO, helpers) y `backend/public/api/` (endpoints).
- En EC2 la API queda en `http://<IP>/api/` (mismo origen que la app, sin CORS raro).
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
  "categoria": "scooter", "precio_base": "3.00", "precio_km": "0.45",
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
| `motos` | id, nombre, tipo, categoria, precio_base, precio_km, precio_dia, km, horas_uso, disponible, imagen |
| `usuarios` | id, nombre, email, telefono, creado_en |
| `viajes` | id, usuario_id (nullable), moto_id (FK), origen/destino calles+coords, distancia_km, duracion_seg, tarifa, factor_demanda, factor_clima, clima_nombre, creado_en |

## Notas

- Sin auth: la app es una demo. Cuando haya login real se agrega un token.
- CORS habilitado en `helpers.php` por si algún día se sirve la API en otro
  origen, pero en EC2 no hace falta (mismo origen).
- `config.php` con `CAMBIAME` tira error 500 con mensaje claro (no se puede
  conectar sin config).