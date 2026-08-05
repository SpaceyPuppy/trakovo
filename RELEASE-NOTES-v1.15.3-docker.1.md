# Trakovo v1.15.3-docker.1

Docker deployment pre-release for isolated VPS testing.

## Included

- Prebuilt GHCR container image tagged `v1.15.3-docker.1`
- Docker deployment bundle with first-run install, upgrade, backup, and database migration tooling
- Shared Caddy and Cloudflare Tunnel deployment options
- Separate per-instance uploads, database, environment, and backup storage

## Important

This is a test-only pre-release. It does not replace the existing cPanel deployment or
its OTA update bundle. Validate it against a disposable database before using any
production data.
