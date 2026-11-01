#!/bin/sh
set -eu

mkdir -p /var/www/appdata storage/app/public storage/app/private \
    storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs

# Keep the key independent from the database. Never silently replace a persisted key.
if [ -n "${APP_KEY:-}" ]; then
    if [ -s /var/www/appdata/app.key ] && [ "$APP_KEY" != "$(cat /var/www/appdata/app.key)" ]; then
        echo 'APP_KEY differs from the persisted key; refusing to rotate it.' >&2
        exit 1
    fi
    printf '%s' "$APP_KEY" > /var/www/appdata/app.key
elif [ ! -s /var/www/appdata/app.key ]; then
    php -r 'file_put_contents("/var/www/appdata/app.key", "base64:".base64_encode(random_bytes(32)));'
fi
export APP_KEY="$(cat /var/www/appdata/app.key)"
php -r 'if (strlen(base64_decode(substr(getenv("APP_KEY"), 7), true) ?: "") !== 32) { fwrite(STDERR, "Invalid APP_KEY.\n"); exit(1); } if (getenv("APP_ENV") === "production" && (strlen(getenv("DB_PASSWORD")) < 16 || str_contains(getenv("DB_PASSWORD"), "local-development"))) { fwrite(STDERR, "Production requires a unique DB password of at least 16 characters.\n"); exit(1); }'
chown -R www-data:www-data /var/www/appdata storage bootstrap/cache
chmod 640 /var/www/appdata/app.key

php artisan config:cache
php artisan migrate --force --no-interaction
if [ ! -L public/storage ]; then
    php artisan storage:link --no-interaction
fi
chown -R www-data:www-data bootstrap/cache /var/www/appdata

exec docker-php-entrypoint "$@"
