#!/bin/bash
# ============================================================
#  MotoFlow - Setup completo para EC2 (Ubuntu 24.04)
#  Correr una sola vez desde la terminal de EC2 Instance Connect
#  como el usuario por defecto (ubuntu). Usa sudo por dentro.
# ============================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== [1/6] Instalando Apache + PHP 8 + MySQL ==="
sudo apt-get update -y
sudo apt-get install -y apache2 php libapache2-mod-php php-mysql php-cli mysql-server git curl

echo "=== [2/6] Arrancando servicios ==="
sudo systemctl enable --now apache2
sudo systemctl enable --now mysql

echo "=== [3/6] Creando base de datos ==="
DB_NAME="motoflow"
DB_USER="motoflow"
DB_PASS="$(openssl rand -hex 12)"
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "=== [4/6] Descargando el codigo desde GitHub ==="
APP_DIR="/var/www/motoflow"
sudo rm -rf "$APP_DIR"
sudo git clone --depth 1 https://github.com/javierparra-dev/alquiler-motos.git "$APP_DIR"

echo "=== [5/6] Generando config.php y sembrando la base ==="
sudo tee "$APP_DIR/backend/src/config.php" >/dev/null <<PHP
<?php
return [
  'db_host'   => 'localhost',
  'db_port'   => 3306,
  'db_name'   => '${DB_NAME}',
  'db_user'   => '${DB_USER}',
  'db_pass'   => '${DB_PASS}',
];
PHP
sudo php "$APP_DIR/backend/install.php"

echo "=== [6/6] Configurando Apache (app en / y API en /api/) ==="
sudo tee /etc/apache2/sites-available/motoflow.conf >/dev/null <<'APACHE'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/motoflow

    Alias /api /var/www/motoflow/backend/public/api

    <Directory /var/www/motoflow>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/motoflow/backend/public/api>
        Options -Indexes
        AllowOverride None
        Require all granted
        <FilesMatch "\.php$">
            SetHandler application/x-httpd-php
        </FilesMatch>
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/motoflow-error.log
    CustomLog ${APACHE_LOG_DIR}/motoflow-access.log combined
</VirtualHost>
APACHE
sudo a2ensite motoflow.conf >/dev/null
sudo a2dissite 000-default.conf >/dev/null
sudo systemctl reload apache2

echo "=== Ready check ==="
curl -s -o /dev/null -w "GET /            -> %{http_code}\n" http://localhost/ || true
echo "GET /api/index.php -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/index.php)"
echo "GET /api/motos.php ->"
curl -s http://localhost/api/motos.php | head -c 240
echo
echo "=== LISTO ==="
echo "Abrí http://<IP_PUBLICA>/ y probá http://<IP_PUBLICA>/api/motos.php"