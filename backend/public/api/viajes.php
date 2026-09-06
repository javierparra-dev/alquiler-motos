<?php
// viajes.php — historial de viajes.
//   GET  /api/viajes.php            -> lista (con nombre de la moto)
//   POST /api/viajes.php            -> crea uno (moto_id obligatorio)

require __DIR__ . '/../../src/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  $sql = 'SELECT v.*, m.nombre AS moto_nombre
          FROM viajes v
          JOIN motos m ON m.id = v.moto_id
          ORDER BY v.id DESC';
  json_out(['viajes' => db()->query($sql)->fetchAll()]);
}

if ($method === 'POST') {
  $data = read_body();
  $err = validate_required($data, ['moto_id']);
  if ($err) json_out(['error' => $err], 400);

  $stmt = db()->prepare(
    'INSERT INTO viajes
       (moto_id, origen_calle, destino_calle, origen_lat, origen_lng,
        destino_lat, destino_lng, distancia_km, duracion_seg, tarifa,
        factor_demanda, factor_clima, clima_nombre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    (int)$data['moto_id'],
    $data['origen_calle']  ?? null,
    $data['destino_calle'] ?? null,
    $data['origen_lat']    ?? null,
    $data['origen_lng']    ?? null,
    $data['destino_lat']   ?? null,
    $data['destino_lng']   ?? null,
    (float)($data['distancia_km'] ?? 0),
    (int)($data['duracion_seg'] ?? 0),
    (float)($data['tarifa'] ?? 0),
    (float)($data['factor_demanda'] ?? 1),
    (float)($data['factor_clima'] ?? 1),
    $data['clima_nombre'] ?? null,
  ]);

  json_out(['ok' => true, 'id' => (int)db()->lastInsertId()], 201);
}

json_out(['error' => 'Método no permitido'], 405);