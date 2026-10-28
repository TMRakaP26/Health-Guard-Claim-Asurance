#!/bin/sh
set -eu

mkdir -p /var/www/data storage/app/public storage/app/private \
    storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs

# Persist the encryption key alongside the database across rebuilds/restarts.
if [ ! -s /var/www/data/app.key ]; then
    php -r 'file_put_contents("/var/www/data/app.key", "base64:".base64_encode(random_bytes(32)));'
fi
export APP_KEY="$(cat /var/www/data/app.key)"
touch /var/www/data/database.sqlite
chown -R www-data:www-data /var/www/data storage bootstrap/cache
chmod 640 /var/www/data/app.key

php artisan config:cache
php artisan migrate --force --no-interaction
if [ ! -L public/storage ]; then
    php artisan storage:link --no-interaction
fi
chown -R www-data:www-data bootstrap/cache /var/www/data

exec docker-php-entrypoint "$@"
