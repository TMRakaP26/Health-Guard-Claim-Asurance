# HealthGuard API

Laravel, PHP 8.4 untuk Docker/CI, Sanctum bearer authentication. Database produksi MySQL 8.4; SQLite dipakai untuk unit/feature test dan pengembangan lokal.

```sh
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
composer test
php vendor/bin/pint --test
```

Untuk SQLite lokal, set DB_CONNECTION=sqlite dan DB_DATABASE path absolut ke file yang sudah dibuat. Jangan memakai migrate:fresh pada data yang ingin dipertahankan.

[Kontrak API](../docs/API.md), [Docker/import/backup](../DOCKER.md), [ADR](../docs/ADR.md).

Command operasional:
- healthguard:create-admin / healthguard:create-analyst (password tersembunyi)
- healthguard:privatize-documents
- healthguard:backfill-history (idempoten)
- healthguard:import-sqlite (hanya tujuan MySQL kosong)
- healthguard:purge-expired (dry run; --apply memerlukan kebijakan retensi aktif)

DatabaseSeeder hanya mengizinkan demo pada local/testing dengan DEMO_SEED_ENABLED=true. E2ESeeder khusus testing. Jangan mengaktifkan fixture pada produksi.
