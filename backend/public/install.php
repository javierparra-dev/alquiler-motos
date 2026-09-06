<?php
// install.php — crea las tablas y siembra las motos desde data/motos.json.
// Uso:  php install.php          (crea tablas + seed si esta vacio)
//       php install.php --force  (borra y resiembra todo)
// Tambien se puede abrir desde el navegador.

require __DIR__ . '/../src/helpers.php';

$force = in_array('--force', array_slice($argv ?? [], 1), true);

$cfg = config();
if (!$cfg) {
  if (PHP_SAPI === 'cli') {
    fwrite(STDERR, "Falta backend/src/config.php (copiá config.example.php).\n");
    exit(1);
  }
  exit("Falta backend/src/config.php");
}

require __DIR__ . '/../src/Db.php';
$pdo = db();

if ($force) {
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
  $pdo->exec('DROP TABLE IF EXISTS viajes');
  $pdo->exec('DROP TABLE IF EXISTS usuarios');
  $pdo->exec('DROP TABLE IF EXISTS motos');
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

$pdo->exec('CREATE TABLE IF NOT EXISTS motos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT \'scooter\',
  categoria VARCHAR(50) NOT NULL DEFAULT \'scooter\',
  precio_base DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_km DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_dia DECIMAL(10,2) NOT NULL DEFAULT 0,
  km INT UNSIGNED NOT NULL DEFAULT 0,
  horas_uso INT UNSIGNED NOT NULL DEFAULT 0,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  imagen VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefono VARCHAR(50) DEFAULT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS viajes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED DEFAULT NULL,
  moto_id INT UNSIGNED NOT NULL,
  origen_calle VARCHAR(150) DEFAULT NULL,
  destino_calle VARCHAR(150) DEFAULT NULL,
  origen_lat DECIMAL(10,6) DEFAULT NULL,
  origen_lng DECIMAL(10,6) DEFAULT NULL,
  destino_lat DECIMAL(10,6) DEFAULT NULL,
  destino_lng DECIMAL(10,6) DEFAULT NULL,
  distancia_km DECIMAL(8,2) NOT NULL DEFAULT 0,
  duracion_seg INT UNSIGNED NOT NULL DEFAULT 0,
  tarifa DECIMAL(10,2) NOT NULL DEFAULT 0,
  factor_demanda DECIMAL(4,2) NOT NULL DEFAULT 1,
  factor_clima DECIMAL(4,2) NOT NULL DEFAULT 1,
  clima_nombre VARCHAR(30) DEFAULT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (moto_id) REFERENCES motos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

// ---- Seed de motos si la tabla esta vacia ----
$count = (int)$pdo->query('SELECT COUNT(*) FROM motos')->fetchColumn();
if ($count === 0) {
  $path = __DIR__ . '/../../data/motos.json';
  $json = @file_get_contents($path);
  if ($json === false) {
    $msg = "No se pudo leer $path";
    if (PHP_SAPI === 'cli') { fwrite(STDERR, "$msg\n"); exit(1); }
    exit($msg);
  }
  $data = json_decode($json, true);
  $stmt = $pdo->prepare(
    'INSERT INTO motos (nombre, tipo, categoria, precio_base, precio_km, precio_dia, km, horas_uso, disponible, imagen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  foreach ($data['motos'] ?? [] as $m) {
    $stmt->execute([
      $m['nombre'],
      $m['tipo'] ?? 'scooter',
      $m['categoria'] ?? ($m['tipo'] ?? 'scooter'),
      $m['precio_base'] ?? 0,
      $m['precio_km'] ?? 0,
      $m['precio_dia'] ?? 0,
      $m['km'] ?? 0,
      $m['horas_uso'] ?? 0,
      $m['disponible'] ? 1 : 0,
      $m['imagen'] ?? null,
    ]);
  }
  $seeded = count($data['motos'] ?? []);
  if (PHP_SAPI === 'cli') {
    echo "Tablas creadas y sembradas: $seeded motos.\n";
  } else {
    echo "Instalación OK: $seeded motos sembradas. \n";
  }
} else {
  $msg = "Tablas OK (motos ya tenía $count filas, no se resiembra).";
  if (PHP_SAPI === 'cli') {
    echo "$msg\nPara borrar y volver a sembrar: php install.php --force\n";
  } else {
    echo "$msg\n";
  }
}