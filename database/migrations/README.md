# Trakovo database migrations

The current `prisma/init.sql` schema is the fresh-install baseline. Existing databases
are verified and recorded as `0000-baseline` the first time the container deployment is
run; the deployment tooling never re-imports that schema over an existing database.

Add future upgrade files here using a sortable name such as:

```text
0001-v1.16.0-add-booking-field.sql
0002-v1.17.0-add-index.sql
```

Migration files are applied in filename order, recorded with a SHA-256 checksum, and
refuse to run if an already-applied file changes. SQL migrations are deliberately kept
explicit because MySQL DDL is not fully transactional; test each migration and document
any required data backup or maintenance window in the release notes.
