<?php
// GET /api/index.php (o /) -> health check de la API.

require __DIR__ . '/../src/helpers.php';

json_out([
  'app'       => 'MotoFlow API',
  'status'    => 'ok',
  'version'   => '1',
  'endpoints' => ['api/motos.php', 'api/viajes.php', 'api/usuarios.php'],
]);