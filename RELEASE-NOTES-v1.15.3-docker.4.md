# Trakovo v1.15.3-docker.4

Docker deployment pre-release fix for MariaDB 11 backups and imports.

## Included

- Bundled MariaDB backups use `mariadb-dump`, with `mysqldump` fallback for MySQL-compatible images
- Bundled imports use the `mariadb` client, with `mysql` fallback
- External database backup/import paths detect either client name

## Important

This is a test-only pre-release and does not replace the existing cPanel deployment.
