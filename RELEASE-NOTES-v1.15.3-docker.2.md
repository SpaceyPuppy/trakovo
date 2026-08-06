# Trakovo v1.15.3-docker.2

Docker deployment pre-release fix for Cloudflare Tunnel connectivity.

## Included

- `cloudflared` has a dedicated outbound Docker network
- The app and database remain on the isolated application network
- The installer checks that the tunnel connector remains running and prints recent logs on failure

## Important

This is a test-only pre-release and does not replace the existing cPanel deployment.
