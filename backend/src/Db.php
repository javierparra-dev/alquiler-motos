<?php
// Db.php — conexión singleton PDO a MySQL.

function db(): PDO {
  static $pdo = null;
  if ($pdo !== null) return $pdo;

  $cfg = config();
  if (!$cfg) {
    if (PHP_SAPI === 'cli') {
      fwrite(STDERR, "Falta backend/src/config.php (copiá config.example.php).\n");
      exit(1);
    }
    json_out(['error' => 'Falta backend/src/config.php'], 500);
  }

  $dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $cfg['db_host'], $cfg['db_port'] ?? 3306, $cfg['db_name']
  );
  $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}