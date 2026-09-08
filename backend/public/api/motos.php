<?php
// GET /api/motos.php            -> lista de motos
// GET /api/motos.php?id=3       -> una moto

require __DIR__ . '/../../src/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
  json_out(['error' => 'Método no permitido'], 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$sql = 'SELECT id, nombre, tipo, categoria, descripcion, precio_base, precio_km, precio_dia, km, horas_uso, disponible, imagen FROM motos';

if ($id) {
  $stmt = db()->prepare($sql . ' WHERE id = ?');
  $stmt->execute([$id]);
  $moto = $stmt->fetch();
  if (!$moto) json_out(['error' => 'Moto no encontrada'], 404);
  json_out(['moto' => $moto]);
}

json_out(['motos' => db()->query($sql)->fetchAll()]);