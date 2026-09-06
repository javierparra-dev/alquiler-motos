<?php
// bootstrap.php — cabeza de todos los endpoints de la API.
require __DIR__ . '/helpers.php';

$cfg = config();
if (!$cfg) {
  json_out(['error' => 'Falta backend/src/config.php (copiá config.example.php)'], 500);
}
require __DIR__ . '/Db.php';