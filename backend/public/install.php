<?php
// install.php — crea/migra la base y siembra datos desde data/motos.json.
// Uso:  php install.php          (crea tablas + seeds si estan vacios)
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
  $drops = [
    'reservas_x_accesorios', 'pagos', 'reservas', 'mantenimientos',
    'motos_x_accesorios', 'accesorios', 'locaciones',
    'viajes', 'usuarios', 'motos',
  ];
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
  foreach ($drops as $t) {
    $pdo->exec("DROP TABLE IF EXISTS `$t`");
  }
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

$pdo->exec('CREATE TABLE IF NOT EXISTS motos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT \'scooter\',
  categoria VARCHAR(50) NOT NULL DEFAULT \'scooter\',
  descripcion TEXT DEFAULT NULL,
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
  origen_lat DECIMAL(10,7) DEFAULT NULL,
  origen_lng DECIMAL(10,7) DEFAULT NULL,
  destino_lat DECIMAL(10,7) DEFAULT NULL,
  destino_lng DECIMAL(10,7) DEFAULT NULL,
  distancia_km DECIMAL(8,2) NOT NULL DEFAULT 0,
  duracion_seg INT UNSIGNED NOT NULL DEFAULT 0,
  tarifa DECIMAL(10,2) NOT NULL DEFAULT 0,
  factor_demanda DECIMAL(5,2) NOT NULL DEFAULT 1,
  factor_clima DECIMAL(5,2) NOT NULL DEFAULT 1,
  clima_nombre VARCHAR(30) DEFAULT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (moto_id) REFERENCES motos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

/* ================================================================
   MIGRACIONES (idempotentes): corrén aunque la base ya exista.
   ================================================================ */

// motos.descripcion (MySQL no tiene ADD COLUMN IF NOT EXISTS)
$hasDesc = $pdo
  ->query("SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='motos' AND COLUMN_NAME='descripcion'")
  ->fetchColumn();
if (!$hasDesc) {
  $pdo->exec('ALTER TABLE motos ADD COLUMN descripcion TEXT DEFAULT NULL');
  echo "Migración: columna motos.descripcion agregada.\n";
}

$pdo->exec('CREATE TABLE IF NOT EXISTS locaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255) DEFAULT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  horario VARCHAR(100) DEFAULT NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS accesorios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio_dia DECIMAL(10,2) NOT NULL DEFAULT 0,
  visible TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS motos_x_accesorios (
  moto_id INT UNSIGNED NOT NULL,
  accesorio_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (moto_id, accesorio_id),
  FOREIGN KEY (moto_id) REFERENCES motos(id),
  FOREIGN KEY (accesorio_id) REFERENCES accesorios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS reservas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED DEFAULT NULL,
  moto_id INT UNSIGNED NOT NULL,
  locacion_retiro INT UNSIGNED DEFAULT NULL,
  locacion_devolucion INT UNSIGNED DEFAULT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado ENUM(\'pendiente\',\'confirmada\',\'activa\',\'finalizada\',\'cancelada\') NOT NULL DEFAULT \'pendiente\',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (moto_id) REFERENCES motos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (locacion_retiro) REFERENCES locaciones(id),
  FOREIGN KEY (locacion_devolucion) REFERENCES locaciones(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS reservas_x_accesorios (
  reserva_id INT UNSIGNED NOT NULL,
  accesorio_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (reserva_id, accesorio_id),
  FOREIGN KEY (reserva_id) REFERENCES reservas(id),
  FOREIGN KEY (accesorio_id) REFERENCES accesorios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS mantenimientos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  moto_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  tipo VARCHAR(100) DEFAULT NULL,
  costo DECIMAL(10,2) NOT NULL DEFAULT 0,
  taller VARCHAR(150) DEFAULT NULL,
  FOREIGN KEY (moto_id) REFERENCES motos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS pagos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reserva_id INT UNSIGNED NOT NULL,
  metodo VARCHAR(50) NOT NULL,
  monto DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado ENUM(\'pendiente\',\'acreditado\',\'rechazado\') NOT NULL DEFAULT \'pendiente\',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reserva_id) REFERENCES reservas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

/* ---- Seeds ---- */

function seed_locaciones(PDO $pdo): void {
  $count = (int)$pdo->query('SELECT COUNT(*) FROM locaciones')->fetchColumn();
  if ($count > 0) return;
  $rows = [
    ['Caseros Centro', 'Av. Tres de Febrero 5457, Caseros', -34.6056, -58.5620, 'Lun-Dom 9:00-21:00'],
    ['Flores', 'Av. Rivadavia 7800, CABA', -34.6302, -58.4630, 'Lun-Dom 9:00-21:00'],
    ['Once', 'Av. Corrientes 3100, CABA', -34.6043, -58.4121, 'Lun-Dom 8:00-22:00'],
    ['Palermo', 'Av. Santa Fe 4300, CABA', -34.5872, -58.4240, 'Lun-Dom 9:00-21:00'],
    ['Quilmes', 'Av. Hipólito Yrigoyen 200, Quilmes', -34.7240, -58.2520, 'Lun-Sáb 9:00-20:00'],
    ['Avellaneda', 'Av. Mitre 600, Avellaneda', -34.6620, -58.3680, 'Lun-Sáb 9:00-20:00'],
    ['Morón', 'Av. Rivadavia 17650, Morón', -34.6510, -58.6210, 'Lun-Sáb 9:00-20:00'],
    ['San Isidro', 'Av. Centenario 400, San Isidro', -34.4750, -58.5200, 'Lun-Sáb 9:00-20:00'],
  ];
  $stmt = $pdo->prepare('INSERT INTO locaciones (nombre, direccion, lat, lng, horario) VALUES (?, ?, ?, ?, ?)');
  foreach ($rows as $r) $stmt->execute($r);
  echo 'Seed: ' . count($rows) . " locaciones.\n";
}

function seed_accesorios(PDO $pdo): void {
  $count = (int)$pdo->query('SELECT COUNT(*) FROM accesorios')->fetchColumn();
  if ($count > 0) return;
  $rows = [
    ['Casco integral', 3000],
    ['Guantes', 1500],
    ['Candado de disco', 1200],
    ['GPS / teléfono', 2500],
    ['Seguro contra robo', 4000],
    ['Funda de lluvia', 1000],
  ];
  $stmt = $pdo->prepare('INSERT INTO accesorios (nombre, precio_dia) VALUES (?, ?)');
  foreach ($rows as $r) $stmt->execute($r);

  // N:M: todas con casco + candado + seguro; la XMAX (id 4) suma GPS.
  $motos = $pdo->query('SELECT id, nombre FROM motos')->fetchAll();
  $acc = [];
  foreach ($pdo->query('SELECT id, nombre FROM accesorios')->fetchAll() as $a) {
    $acc[$a['nombre']] = (int)$a['id'];
  }
  $map = [];
  foreach ($motos as $m) {
    $map[(int)$m['id']] = ['Casco integral', 'Candado de disco', 'Seguro contra robo'];
    if (stripos($m['nombre'], 'XMAX') !== false) {
      $map[(int)$m['id']][] = 'GPS / teléfono';
    }
  }
  $stmt2 = $pdo->prepare('INSERT INTO motos_x_accesorios (moto_id, accesorio_id) VALUES (?, ?)');
  foreach ($map as $motoId => $nombres) {
    foreach ($nombres as $n) $stmt2->execute([$motoId, $acc[$n]]);
  }
  echo "Seed: accesorios y motos_x_accesorios.\n";
}

function seed_descripciones(PDO $pdo): void {
  $path = __DIR__ . '/../../data/motos.json';
  $json = @file_get_contents($path);
  if (!$json) return;
  $data = json_decode($json, true);
  $stmt = $pdo->prepare('UPDATE motos SET descripcion = ? WHERE nombre = ? AND descripcion IS NULL');
  foreach ($data['motos'] ?? [] as $m) {
    if (!empty($m['descripcion'])) {
      $stmt->execute([$m['descripcion'], $m['nombre']]);
    }
  }
}

seed_locaciones($pdo);
seed_accesorios($pdo);
seed_descripciones($pdo);

/* ---- Seed de motos (solo si la tabla esta vacia) ---- */
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
    'INSERT INTO motos (nombre, tipo, categoria, descripcion, precio_base, precio_km, precio_dia, km, horas_uso, disponible, imagen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  foreach ($data['motos'] ?? [] as $m) {
    $stmt->execute([
      $m['nombre'],
      $m['tipo'] ?? 'scooter',
      $m['categoria'] ?? ($m['tipo'] ?? 'scooter'),
      $m['descripcion'] ?? null,
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
    echo "Seed: $seeded motos.\n";
  } else {
    echo "Instalación OK: $seeded motos sembradas. \n";
  }
} else {
  if (PHP_SAPI === 'cli') {
    echo "Tablas OK (motos ya tenía $count filas, no se resiembra).\nPara borrar y volver a sembrar: php install.php --force\n";
  } else {
    echo "Tablas OK (motos ya tenía $count filas, no se resiembra).\n";
  }
}

if (PHP_SAPI === 'cli') {
  echo "Instalación/migración completa.\n";
}