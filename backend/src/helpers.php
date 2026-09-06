<?php
// helpers.php — respuestas JSON + CORS + validación.
// Incluido por bootstrap y por install.php (modo CLI).

if (PHP_SAPI !== 'cli') {
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function config(): array {
  $path = __DIR__ . '/config.php';
  if (!is_file($path)) return [];
  return require $path;
}

function json_out($data, int $code = 200): void {
  if (PHP_SAPI !== 'cli') http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
  exit;
}

function read_body(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function validate_required(array $data, array $fields): ?string {
  foreach ($fields as $f) {
    if (!array_key_exists($f, $data) || $data[$f] === '' || $data[$f] === null) {
      return "Falta el campo '$f'";
    }
  }
  return null;
}