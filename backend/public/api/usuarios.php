<?php
// usuarios.php — usuarios minimos.
//   POST /api/usuarios.php                    -> crea (nombre y email obligatorios)
//   GET  /api/usuarios.php                    -> lista
//   GET  /api/usuarios.php?id=1               -> uno

require __DIR__ . '/../../src/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
  $data = read_body();
  $err = validate_required($data, ['nombre', 'email']);
  if ($err) json_out(['error' => $err], 400);

  $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
  if (!$email) json_out(['error' => 'Email inválido'], 400);

  $stmt = db()->prepare('INSERT INTO usuarios (nombre, email, telefono) VALUES (?, ?, ?)');
  $stmt->execute([$data['nombre'], $email, $data['telefono'] ?? null]);

  json_out(['ok' => true, 'id' => (int)db()->lastInsertId()], 201);
}

if ($method === 'GET') {
  $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
  if ($id) {
    $stmt = db()->prepare('SELECT id, nombre, email, telefono, creado_en FROM usuarios WHERE id = ?');
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if (!$u) json_out(['error' => 'Usuario no encontrado'], 404);
    json_out(['usuario' => $u]);
  }
  json_out(['usuarios' => db()->query('SELECT id, nombre, email FROM usuarios ORDER BY id DESC')->fetchAll()]);
}

json_out(['error' => 'Método no permitido'], 405);