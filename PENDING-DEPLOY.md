# Pending Production Deployment

This file tracks everything that must be done on the production server before the next release.
Update it as features are built. Clear it after each successful production deployment.

---

## Current pending version: v1.15.3 (invoice payment details and void deletion pending)

> Docker test pre-release `v1.15.3-docker.3` is isolated from production and does not
> replace this pending cPanel deployment.

### Deploy checklist
- [x] v1.15.0 production SQL audited and applied; production tables converted to InnoDB
- [x] v1.15.1 authentication hotfix deployed and admin login verified
- [ ] Upload/install the v1.15.3 `.next` bundle; it supersedes the v1.15.2 OTA bundle and retains the corrected v1.15.1 root `app.js`
- [ ] Restart Passenger and confirm admin login remains healthy
- [ ] Review vendor billing and confirm no hire starting before 2026-07-01 appears
- [ ] Create one single vendor-trip draft invoice and confirm it is absent from the next bill-run review
- [ ] Create a reviewed multi-booking bill run and confirm skipped/unclaimed bookings remain outstanding
- [ ] Print or save an invoice as PDF and confirm admin navigation and framing are absent
- [ ] Save payment details with `Reference: {{invoice_number}}` and confirm the actual reference appears on-screen and in Print / Save PDF
- [ ] Void an unpaid invoice, delete it permanently, and confirm the booking can be invoiced again

### Pending production configuration

No SQL, environment-variable, dependency, or cron changes are required for v1.15.3.
Payment details are stored in the existing `Setting` table under `billing_invoice_footer`.
The vendor billing commencement date is an application rule fixed at 2026-07-01
and is evaluated against `Booking.start_date`.
The v1.15.0 migration below is retained as the audited production deployment record.

### v1.15.0 deployed SQL record

This is a one-time existing-install migration, not a fresh-install script. Run it in order with booking writes paused. `prisma/init.sql` remains the source for fresh databases.

> **Do not execute this whole Markdown code block blindly.** The repository has no automatic migration ledger. Run the preflight first, then execute each individually labelled statement only when its table/column/index is absent. A duplicate column, index, or foreign-key error is a hard stop: inspect the schema before continuing rather than skipping an unknown failure.

Preflight expectations:

- `Invoice` is either absent or has the prototype `amount` column. If it already has `total_amount`, stop: the native ledger has already been installed.
- `InvoiceLegacyBackup` must not coexist with a prototype `Invoice`; if both exist, stop and investigate instead of overwriting either table.
- Check whether each older pending column/index is already present. Skip only the individually labelled pre-v1.15 statement when the preflight result proves it has already been applied.

```sql
-- Read-only preflight: save these results with the deployment record.
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('Invoice', 'InvoiceLegacyBackup', 'BillingRun', 'InvoiceLine',
                     'Payment', 'PaymentAllocation', 'BillingEvent', 'RequestIdempotency',
                     'AdminUser', 'Driver', 'DriverMessage');

SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'Invoice' AND COLUMN_NAME IN ('amount', 'total_amount'))
    OR (TABLE_NAME = 'Booking' AND COLUMN_NAME IN ('google_event_id', 'ms_event_id', 'currency', 'completed_at'))
    OR (TABLE_NAME = 'Booking' AND COLUMN_NAME IN ('driver_id', 'enquiry_status'))
    OR (TABLE_NAME = 'Vehicle' AND COLUMN_NAME IN
        ('licence_category', 'public_bookings_enabled', 'vendor_bookings_enabled'))
    OR (TABLE_NAME = 'Vendor' AND COLUMN_NAME IN
        ('vehicle_hire_enabled', 'taxi_enabled', 'billing_name', 'billing_email',
         'billing_address', 'billing_abn', 'billing_currency', 'billing_terms_days',
         'billing_enabled')))
ORDER BY TABLE_NAME, COLUMN_NAME;

-- These structures pre-date v1.15 and are used in production code. Verify
-- their deployed definitions against prisma/init.sql; do not recreate or drop
-- populated identity/messaging tables during this migration.
SHOW CREATE TABLE `AdminUser`;
SHOW CREATE TABLE `Driver`;
SHOW CREATE TABLE `DriverMessage`;

SELECT TABLE_NAME, INDEX_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN ('Booking_vehicle_status_dates_idx', 'Booking_vendor_billing_idx',
                     'VehicleBlockout_vehicle_dates_idx', 'VehicleBlockout_vehicle_idx')
ORDER BY TABLE_NAME, INDEX_NAME;
```

```sql
-- Outstanding pre-v1.15 atomic public IDs and indexed availability locks.
-- Apply this block before restarting the new application build.
CREATE TABLE IF NOT EXISTS `PublicIdSequence` (
  `prefix` VARCHAR(10) NOT NULL,
  `last_value` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`prefix`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed every existing prefix before the application starts allocating from
-- PublicIdSequence. These statements are safe to re-run.
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'VHB', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `Booking`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'VHC', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `Vehicle`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'VND', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `Vendor`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'VNC', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `VendorClient`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'VNE', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `VendorEnquiry`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'DRV', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `Driver`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'CRQ', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `CorporateEnquiry`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));

ALTER TABLE `Booking`
  ADD INDEX `Booking_vehicle_status_dates_idx`
    (`vehicle_id`(36), `status`(20), `start_date`(10), `end_date`(10));
ALTER TABLE `VehicleBlockout`
  ADD INDEX `VehicleBlockout_vehicle_dates_idx` (`vehicle_id`(36), `start_date`, `end_date`),
  DROP INDEX `VehicleBlockout_vehicle_idx`;

-- v1.12.0 (apply if not already done)
ALTER TABLE `Booking` ADD COLUMN `ms_event_id` VARCHAR(191) NULL AFTER `google_event_id`;
ALTER TABLE `Booking` DROP COLUMN `google_event_id`;

-- v1.13.0 — Vendor service type toggles
ALTER TABLE `Vendor` ADD COLUMN `vehicle_hire_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active`;
ALTER TABLE `Vendor` ADD COLUMN `taxi_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `vehicle_hire_enabled`;

-- v1.15.0 native billing ledger and safe prototype preservation.
-- v1.15.0 native billing prerequisites. These ALTER statements are one-time.
-- Run each statement only when preflight shows that exact item is missing.
ALTER TABLE `Booking`
  ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'AUD' AFTER `total_cost`;
ALTER TABLE `Booking`
  ADD COLUMN `completed_at` DATETIME NULL AFTER `vendor_client_id`;
ALTER TABLE `Booking`
  ADD INDEX `Booking_vendor_billing_idx`
    (`vendor_id`(36), `status`(20), `is_enquiry`, `end_date`(10));

UPDATE `Booking`
SET `currency` = 'AUD'
WHERE `currency` IS NULL OR TRIM(`currency`) = '';

-- Preserve the currency of existing vehicle-priced bookings. Invalid legacy
-- vehicle currency values remain AUD and must be reviewed manually.
UPDATE `Booking` b
JOIN `Vehicle` v ON v.`id` = b.`vehicle_id`
SET b.`currency` = UPPER(TRIM(v.`currency`))
WHERE TRIM(v.`currency`) REGEXP '^[A-Za-z]{3}$';

UPDATE `Booking`
SET `completed_at` = `updated_at`
WHERE `status` = 'completed' AND `completed_at` IS NULL;

ALTER TABLE `Vendor`
  ADD COLUMN `billing_name` VARCHAR(191) NOT NULL DEFAULT '' AFTER `contact_phone`;
ALTER TABLE `Vendor`
  ADD COLUMN `billing_email` VARCHAR(191) NOT NULL DEFAULT '' AFTER `billing_name`;
ALTER TABLE `Vendor`
  ADD COLUMN `billing_address` TEXT NULL AFTER `billing_email`;
ALTER TABLE `Vendor`
  ADD COLUMN `billing_abn` VARCHAR(32) NOT NULL DEFAULT '' AFTER `billing_address`;
ALTER TABLE `Vendor`
  ADD COLUMN `billing_currency` VARCHAR(10) NOT NULL DEFAULT 'AUD' AFTER `billing_abn`;
ALTER TABLE `Vendor`
  ADD COLUMN `billing_terms_days` INTEGER NOT NULL DEFAULT 14 AFTER `billing_currency`;
ALTER TABLE `Vendor`
  ADD COLUMN `billing_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `billing_terms_days`;

UPDATE `Vendor` SET `billing_name` = `name` WHERE TRIM(`billing_name`) = '';
UPDATE `Vendor` SET `billing_email` = `contact_email` WHERE TRIM(`billing_email`) = '';

-- No-vehicle vendor work is denominated in the vendor billing currency. At
-- first migration this is AUD unless staff deliberately configured otherwise.
UPDATE `Booking` b
JOIN `Vendor` v ON v.`id` = b.`vendor_id`
SET b.`currency` = UPPER(TRIM(v.`billing_currency`))
WHERE b.`vehicle_id` IS NULL
  AND TRIM(v.`billing_currency`) REGEXP '^[A-Za-z]{3}$';

-- Preserve the prototype before creating the new Invoice table. The rename is
-- a no-op when Invoice is absent. Preflight must show no conflicting backup.
SET @prototype_invoice_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Invoice' AND COLUMN_NAME = 'amount'
);
SET @invoice_backup_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'InvoiceLegacyBackup'
);
SET @rename_invoice_sql := IF(
  @prototype_invoice_exists = 1 AND @invoice_backup_exists = 0,
  'RENAME TABLE `Invoice` TO `InvoiceLegacyBackup`',
  'SELECT 1'
);
PREPARE rename_invoice_statement FROM @rename_invoice_sql;
EXECUTE rename_invoice_statement;
DEALLOCATE PREPARE rename_invoice_statement;

-- Empty only when the prototype never existed. Never drop this backup in the
-- v1.15.0 deployment or rollback.
CREATE TABLE IF NOT EXISTS `InvoiceLegacyBackup` (
  `id` VARCHAR(191) NOT NULL,
  `public_id` VARCHAR(191) NOT NULL,
  `booking_id` VARCHAR(191) NOT NULL,
  `amount` INTEGER NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'AUD',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `due_date` VARCHAR(10) NULL,
  `paid_at` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `InvoiceLegacyBackup_public_id_unique` (`public_id`),
  UNIQUE INDEX `InvoiceLegacyBackup_booking_id_unique` (`booking_id`),
  INDEX `InvoiceLegacyBackup_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `BillingRun` (
  `id` VARCHAR(191) NOT NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `cutoff_date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'processing',
  `vendor_filter` TEXT NULL,
  `invoice_count` INTEGER NOT NULL DEFAULT 0,
  `booking_count` INTEGER NOT NULL DEFAULT 0,
  `total_amount` BIGINT NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'AUD',
  `notes` TEXT NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `BillingRun_idempotency_key_idx` (`idempotency_key`),
  INDEX `BillingRun_cutoff_created_idx` (`cutoff_date`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Invoice` (
  `id`                    VARCHAR(191) NOT NULL,
  `public_id`             VARCHAR(191) NOT NULL,
  `billing_run_id`        VARCHAR(191) NULL,
  `booking_id`            VARCHAR(191) NULL,
  `vendor_id`             VARCHAR(191) NULL,
  `invoice_type`          VARCHAR(20) NOT NULL DEFAULT 'direct',
  `status`                VARCHAR(20) NOT NULL DEFAULT 'draft',
  `currency`              VARCHAR(10) NOT NULL DEFAULT 'AUD',
  `issuer_name`           VARCHAR(191) NOT NULL,
  `issuer_abn`            VARCHAR(32) NOT NULL DEFAULT '',
  `issuer_email`          VARCHAR(191) NOT NULL DEFAULT '',
  `issuer_phone`          VARCHAR(50) NOT NULL DEFAULT '',
  `issuer_address`        TEXT NULL,
  `recipient_name`        VARCHAR(191) NOT NULL,
  `recipient_abn`         VARCHAR(32) NOT NULL DEFAULT '',
  `recipient_email`       VARCHAR(191) NOT NULL DEFAULT '',
  `recipient_phone`       VARCHAR(50) NOT NULL DEFAULT '',
  `recipient_address`     TEXT NULL,
  `issue_date`            DATE NULL,
  `due_date`              DATE NULL,
  `payment_terms_days`    INTEGER NOT NULL DEFAULT 14,
  `tax_mode`              VARCHAR(20) NOT NULL DEFAULT 'none',
  `tax_rate_bps`          INTEGER NOT NULL DEFAULT 0,
  `subtotal_amount`       BIGINT NOT NULL DEFAULT 0,
  `tax_amount`            BIGINT NOT NULL DEFAULT 0,
  `total_amount`          BIGINT NOT NULL DEFAULT 0,
  `amount_paid`           BIGINT NOT NULL DEFAULT 0,
  `balance_due`           BIGINT NOT NULL DEFAULT 0,
  `notes`                 TEXT NULL,
  `issued_at`             DATETIME NULL,
  `paid_at`               DATETIME NULL,
  `voided_at`             DATETIME NULL,
  `created_by`            VARCHAR(191) NOT NULL,
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Invoice_public_id_unique` (`public_id`),
  INDEX `Invoice_billing_run_idx` (`billing_run_id`),
  INDEX `Invoice_booking_idx` (`booking_id`),
  INDEX `Invoice_vendor_status_idx` (`vendor_id`(36), `status`),
  INDEX `Invoice_status_due_idx` (`status`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- v1.14.4 — Contact enquiries
CREATE TABLE IF NOT EXISTS `InvoiceLine` (
  `id` VARCHAR(191) NOT NULL,
  `invoice_id` VARCHAR(191) NOT NULL,
  `booking_id` VARCHAR(191) NULL,
  `booking_claim` VARCHAR(191) NULL,
  `description` TEXT NOT NULL,
  `service_start` DATE NULL,
  `service_end` DATE NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `unit_amount` BIGINT NOT NULL,
  `subtotal_amount` BIGINT NOT NULL,
  `tax_rate_bps` INTEGER NOT NULL DEFAULT 0,
  `tax_amount` BIGINT NOT NULL DEFAULT 0,
  `total_amount` BIGINT NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `InvoiceLine_booking_claim_unique` (`booking_claim`),
  INDEX `InvoiceLine_invoice_sort_idx` (`invoice_id`, `sort_order`),
  INDEX `InvoiceLine_booking_idx` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `vendor_id` VARCHAR(191) NULL,
  `amount` BIGINT NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'AUD',
  `payment_date` DATE NOT NULL,
  `method` VARCHAR(50) NOT NULL DEFAULT 'manual',
  `reference` VARCHAR(191) NOT NULL DEFAULT '',
  `notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'posted',
  `created_by` VARCHAR(191) NOT NULL,
  `reversed_at` DATETIME NULL,
  `reversed_by` VARCHAR(191) NULL,
  `reversal_reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `Payment_vendor_date_idx` (`vendor_id`(36), `payment_date`),
  INDEX `Payment_reference_idx` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PaymentAllocation` (
  `id` VARCHAR(191) NOT NULL,
  `payment_id` VARCHAR(191) NOT NULL,
  `invoice_id` VARCHAR(191) NOT NULL,
  `amount` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentAllocation_payment_invoice_unique` (`payment_id`, `invoice_id`),
  INDEX `PaymentAllocation_invoice_idx` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `BillingEvent` (
  `id` VARCHAR(191) NOT NULL,
  `invoice_id` VARCHAR(191) NULL,
  `billing_run_id` VARCHAR(191) NULL,
  `payment_id` VARCHAR(191) NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `actor` VARCHAR(191) NOT NULL,
  `details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `BillingEvent_invoice_created_idx` (`invoice_id`, `created_at`),
  INDEX `BillingEvent_run_created_idx` (`billing_run_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RequestIdempotency` (
  `id` VARCHAR(191) NOT NULL,
  `scope` VARCHAR(63) NOT NULL,
  `key` VARCHAR(128) NOT NULL,
  `request_hash` VARCHAR(64) NOT NULL,
  `status_code` INTEGER NULL,
  `response_body` TEXT NULL,
  `resource_id` VARCHAR(191) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RequestIdempotency_scope_key_unique` (`scope`, `key`),
  INDEX `RequestIdempotency_expires_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Invoice`
  ADD CONSTRAINT `Invoice_billing_run_id_fkey` FOREIGN KEY (`billing_run_id`) REFERENCES `BillingRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InvoiceLine`
  ADD CONSTRAINT `InvoiceLine_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `InvoiceLine_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentAllocation`
  ADD CONSTRAINT `PaymentAllocation_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentAllocation_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BillingEvent`
  ADD CONSTRAINT `BillingEvent_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BillingEvent_billing_run_id_fkey` FOREIGN KEY (`billing_run_id`) REFERENCES `BillingRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BillingEvent_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Outstanding pre-v1.15 contact-enquiry table.
CREATE TABLE IF NOT EXISTS `ContactEnquiry` (
  `id` VARCHAR(191) NOT NULL,
  `public_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NOT NULL DEFAULT '',
  `message` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'new',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `ContactEnquiry_public_id_key` (`public_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Invoice and ContactEnquiry are created above on installations upgrading to
-- v1.14.4, so seed their counters after those tables exist.
-- Migrate prototype invoices without modifying the backup. Old totals were
-- already integer cents. Tax is recorded as none because the prototype did not
-- retain a tax snapshot.
INSERT IGNORE INTO `Invoice` (
  `id`, `public_id`, `billing_run_id`, `booking_id`, `vendor_id`, `invoice_type`,
  `status`, `currency`, `issuer_name`, `issuer_abn`, `issuer_email`,
  `issuer_phone`, `issuer_address`, `recipient_name`, `recipient_abn`,
  `recipient_email`, `recipient_phone`, `recipient_address`, `issue_date`,
  `due_date`, `payment_terms_days`, `tax_mode`, `tax_rate_bps`,
  `subtotal_amount`, `tax_amount`, `total_amount`, `amount_paid`, `balance_due`,
  `notes`, `issued_at`, `paid_at`, `voided_at`, `created_by`, `created_at`, `updated_at`
)
SELECT
  legacy.`id`, legacy.`public_id`, NULL, legacy.`booking_id`, booking.`vendor_id`,
  IF(booking.`vendor_id` IS NULL, 'direct', 'vendor'),
  CASE legacy.`status`
    WHEN 'sent' THEN 'issued'
    WHEN 'paid' THEN 'paid'
    WHEN 'void' THEN 'void'
    ELSE 'draft'
  END,
  COALESCE(NULLIF(legacy.`currency`, ''), booking.`currency`, 'AUD'),
  COALESCE(
    NULLIF((SELECT `value` FROM `Setting` WHERE `key` = 'billing_legal_name' LIMIT 1), ''),
    NULLIF((SELECT `value` FROM `Setting` WHERE `key` = 'site_name' LIMIT 1), ''),
    'Trakovo'
  ),
  COALESCE((SELECT `value` FROM `Setting` WHERE `key` = 'billing_abn' LIMIT 1), ''),
  COALESCE((SELECT `value` FROM `Setting` WHERE `key` = 'billing_email' LIMIT 1), ''),
  COALESCE((SELECT `value` FROM `Setting` WHERE `key` = 'billing_phone' LIMIT 1), ''),
  (SELECT `value` FROM `Setting` WHERE `key` = 'billing_address' LIMIT 1),
  IF(booking.`vendor_id` IS NULL,
     COALESCE(NULLIF(booking.`contact_name`, ''), booking.`contact_email`),
     COALESCE(NULLIF(vendor.`billing_name`, ''), vendor.`name`)),
  IF(booking.`vendor_id` IS NULL, '', COALESCE(vendor.`billing_abn`, '')),
  IF(booking.`vendor_id` IS NULL, booking.`contact_email`,
     COALESCE(NULLIF(vendor.`billing_email`, ''), vendor.`contact_email`)),
  IF(booking.`vendor_id` IS NULL, booking.`contact_phone`, vendor.`contact_phone`),
  IF(booking.`vendor_id` IS NULL, NULL, vendor.`billing_address`),
  IF(legacy.`status` IN ('sent', 'paid'), DATE(legacy.`created_at`), NULL),
  CASE
    WHEN legacy.`due_date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN STR_TO_DATE(legacy.`due_date`, '%Y-%m-%d')
    ELSE NULL
  END,
  COALESCE(vendor.`billing_terms_days`, 14),
  'none', 0,
  legacy.`amount`, 0, legacy.`amount`,
  IF(legacy.`status` = 'paid', legacy.`amount`, 0),
  IF(legacy.`status` = 'paid', 0, legacy.`amount`),
  legacy.`notes`,
  IF(legacy.`status` IN ('sent', 'paid'), legacy.`created_at`, NULL),
  IF(legacy.`status` = 'paid', COALESCE(legacy.`paid_at`, legacy.`updated_at`), NULL),
  IF(legacy.`status` = 'void', legacy.`updated_at`, NULL),
  'v1.15.0 migration', legacy.`created_at`, legacy.`updated_at`
FROM `InvoiceLegacyBackup` legacy
JOIN `Booking` booking ON booking.`id` = legacy.`booking_id`
LEFT JOIN `Vendor` vendor ON vendor.`id` = booking.`vendor_id`;

INSERT IGNORE INTO `InvoiceLine` (
  `id`, `invoice_id`, `booking_id`, `booking_claim`, `description`,
  `service_start`, `service_end`, `quantity`, `unit_amount`, `subtotal_amount`,
  `tax_rate_bps`, `tax_amount`, `total_amount`, `sort_order`, `created_at`
)
SELECT
  CONCAT('legacy-line-', SHA2(legacy.`id`, 256)),
  legacy.`id`, legacy.`booking_id`,
  IF(legacy.`status` = 'void', NULL, legacy.`booking_id`),
  CONCAT(COALESCE(vehicle.`name`, IF(booking.`service_type` = 'taxi', 'Taxi service', 'Vehicle hire')),
         ' - booking ', booking.`public_id`, ' - ', booking.`start_date`, ' to ', booking.`end_date`),
  booking.`start_date`, booking.`end_date`, 1.00,
  legacy.`amount`, legacy.`amount`, 0, 0, legacy.`amount`, 0, legacy.`created_at`
FROM `InvoiceLegacyBackup` legacy
JOIN `Invoice` invoice_record ON invoice_record.`id` = legacy.`id`
JOIN `Booking` booking ON booking.`id` = legacy.`booking_id`
LEFT JOIN `Vehicle` vehicle ON vehicle.`id` = booking.`vehicle_id`;

INSERT IGNORE INTO `Payment` (
  `id`, `vendor_id`, `amount`, `currency`, `payment_date`, `method`,
  `reference`, `notes`, `status`, `created_by`, `created_at`
)
SELECT
  CONCAT('legacy-payment-', SHA2(legacy.`id`, 256)),
  booking.`vendor_id`, legacy.`amount`,
  COALESCE(NULLIF(legacy.`currency`, ''), booking.`currency`, 'AUD'),
  DATE(COALESCE(legacy.`paid_at`, legacy.`updated_at`)),
  'legacy', legacy.`public_id`, 'Migrated from InvoiceLegacyBackup',
  'posted', 'v1.15.0 migration', legacy.`updated_at`
FROM `InvoiceLegacyBackup` legacy
JOIN `Booking` booking ON booking.`id` = legacy.`booking_id`
WHERE legacy.`status` = 'paid';

INSERT IGNORE INTO `PaymentAllocation` (`id`, `payment_id`, `invoice_id`, `amount`, `created_at`)
SELECT
  CONCAT('legacy-allocation-', SHA2(legacy.`id`, 256)),
  CONCAT('legacy-payment-', SHA2(legacy.`id`, 256)),
  legacy.`id`, legacy.`amount`, legacy.`updated_at`
FROM `InvoiceLegacyBackup` legacy
JOIN `Invoice` invoice_record ON invoice_record.`id` = legacy.`id`
WHERE legacy.`status` = 'paid';

INSERT IGNORE INTO `BillingEvent` (
  `id`, `invoice_id`, `billing_run_id`, `payment_id`, `event_type`,
  `actor`, `details`, `created_at`
)
SELECT
  CONCAT('legacy-event-', SHA2(legacy.`id`, 256)),
  legacy.`id`, NULL, NULL, 'invoice_migrated', 'v1.15.0 migration',
  JSON_OBJECT('source', 'InvoiceLegacyBackup', 'legacy_status', legacy.`status`),
  legacy.`updated_at`
FROM `InvoiceLegacyBackup` legacy
JOIN `Invoice` invoice_record ON invoice_record.`id` = legacy.`id`;

-- Seed invoice references only after the new ledger and any legacy rows exist.
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'INV', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `Invoice`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));
INSERT INTO `PublicIdSequence` (`prefix`, `last_value`)
SELECT 'CNT', COALESCE(MAX(CAST(SUBSTRING(`public_id`, 5) AS UNSIGNED)), 0) FROM `ContactEnquiry`
ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`));

-- Migration verification. Do not deploy the application if these expose a
-- mismatch, duplicate booking claim, negative balance, or missing constraint.
SELECT
  (SELECT COUNT(*) FROM `InvoiceLegacyBackup`) AS legacy_invoice_rows,
  (SELECT COUNT(*) FROM `Invoice` WHERE `created_by` = 'v1.15.0 migration') AS migrated_invoice_rows,
  (SELECT COUNT(*) FROM `InvoiceLine` line_item
   JOIN `Invoice` invoice_record ON invoice_record.`id` = line_item.`invoice_id`
   WHERE invoice_record.`created_by` = 'v1.15.0 migration') AS migrated_line_rows;

SELECT `booking_claim`, COUNT(*) AS claim_count
FROM `InvoiceLine`
WHERE `booking_claim` IS NOT NULL
GROUP BY `booking_claim`
HAVING COUNT(*) > 1;

SELECT `id`, `public_id`, `total_amount`, `amount_paid`, `balance_due`
FROM `Invoice`
WHERE `total_amount` < 0 OR `amount_paid` < 0 OR `balance_due` < 0
   OR `amount_paid` + `balance_due` <> `total_amount`;

SELECT `prefix`, `last_value`
FROM `PublicIdSequence`
WHERE `prefix` IN ('VHB', 'VHC', 'VND', 'VNC', 'VNE', 'DRV', 'CRQ', 'INV', 'CNT')
ORDER BY `prefix`;

SELECT TABLE_NAME, CONSTRAINT_NAME
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('Invoice', 'InvoiceLine', 'Payment', 'PaymentAllocation', 'BillingEvent')
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
```

### New env vars
No new v1.15.0 environment variables. The existing `CRON_SECRET` remains required, and the daily `POST /api/cron/email-sequences` cPanel job must be active so expired idempotency records are cleaned up.

### Strict migration order

1. Pause all writes and take the verified database backup.
2. Run the read-only preflight and compare deployed identity, driver, booking, vehicle, vendor, and messaging structures with `prisma/init.sql`.
3. Apply only genuinely outstanding pre-v1.15 columns/indexes (`ms_event_id`, vendor service toggles, `PublicIdSequence`, availability indexes, `ContactEnquiry`).
4. Add Booking currency/completion fields and Vendor billing-profile fields; run their backfills.
5. Rename a prototype `Invoice` to `InvoiceLegacyBackup`. Stop if both already exist or if `Invoice` already contains `total_amount`.
6. Create the native billing/idempotency tables, indexes, and foreign keys.
7. Migrate any prototype invoice rows, lines, and paid-payment records from the untouched backup.
8. Seed every `PublicIdSequence` prefix, including `INV`, after migration.
9. Run every verification query and save the results.
10. Deploy/restart the application, then complete acceptance checks before resuming writes.

### Rollback

- Keep maintenance mode enabled and stop all writes.
- Roll back the application bundle to the pre-v1.15 build.
- Restore the complete pre-migration database backup. This is the preferred rollback because Booking and Vendor rows are changed as part of the cutover.
- Do not try to make the old build use the new `Invoice` table.
- Do not drop or rename `InvoiceLegacyBackup`; retain it until the release and migrated invoice counts have been independently accepted.
- Restart Passenger against the restored database, verify the old build, then resume writes.

### Post-deploy steps
1. Configure and review issuer/vendor billing profiles before issuing a production invoice
2. Confirm `CRON_SECRET` and the daily cPanel email-sequences job are active; its JSON must report `idempotency_cleanup: true`
3. Keep `InvoiceLegacyBackup` and the database backup until financial history and staff acceptance are signed off
1. Confirm all pending SQL above was applied successfully before the application restart
2. In Admin → Settings → Connections, **disconnect and reconnect Microsoft 365** if not already done (required for `Calendars.ReadWrite` scope)
3. In Admin → Settings → General → Site Branding: set a **Vendor Portal Name** to distinguish it from the Admin portal in browser tabs

### Post-deploy verification
- [ ] Confirm all migration verification queries returned expected counts, no duplicate booking claims, no invalid balances, and all billing foreign keys
- [ ] Confirm `InvoiceLegacyBackup` still exists and its row count matches the saved preflight count
- [ ] Confirm `Booking.currency`, `Booking.completed_at`, vendor billing fields, and both billing/availability indexes exist
- [ ] Confirm `AdminUser`, `Driver`, and `DriverMessage` definitions still match `prisma/init.sql` and existing row counts are unchanged
- [ ] Configure issuer legal name/contact/address and confirm GST mode is intentionally `none` or `inclusive`
- [ ] Review vendor billing names, emails, terms, currencies, and enabled flags
- [ ] Complete a priced vendor booking, review the queue, and create a consolidated draft bill run
- [ ] After review, reprice one selected booking and confirm run creation returns `billing_review_stale` and creates no invoices
- [ ] Repeat the cutoff and confirm the same booking is not invoiced twice
- [ ] Create a direct draft invoice, issue it, record a partial payment, then record the balance
- [ ] Confirm paid/part-paid totals and audit events are correct and an invoice with payment cannot be voided
- [ ] Retry an invoice/payment/run write with the same idempotency key and confirm it replays without duplication
- [ ] Run the authenticated daily email-sequences cron and confirm HTTP 200 with `idempotency_cleanup: true`
- [ ] Open several booking details rapidly in separate tabs and confirm none return 500/server unavailable
- [ ] Exercise Admin Quick Add twice with the same idempotency key and confirm only one booking is created
- [ ] Verify booking list/calendar pagination/date windows and vendor multi-booking options load correctly
- [ ] Confirm `PublicIdSequence` is seeded and both new availability indexes exist
- [ ] Submit a public vehicle booking and confirm its booking reference, notifications, and calendar sync
- [ ] Submit vendor single and bulk bookings and confirm successful rows and validation errors are reported correctly
- [ ] Submit two overlapping requests for the same vehicle and dates; only one booking should be created
- [ ] Admin dashboard totals and vendor, driver, and client list counts load correctly
- [ ] Settings save successfully and driver trip schedules render correctly
- [ ] Admin → Invoices: list page loads; filter tabs work
- [ ] Admin → Booking detail → Invoice section appears; "Create Invoice" creates draft and redirects to detail
- [ ] Admin → Invoice detail: mark as paid, void, print all work correctly
- [ ] Admin → Reports: date range + Run Report shows summary cards, booking breakdown, vehicle + vendor tables
- [ ] Admin → Reports: select a vendor → vendor statement section appears; Print Statement works
- [ ] Admin → Vendor detail page → Username shows Edit button; clicking it allows username change with inline feedback
- [ ] Admin → Vendor detail page → "Login as Vendor →" button opens vendor portal in new tab, logged in as that vendor
- [ ] Admin → Vendor detail page → Taxi Trips toggle defaults to off; Vehicle Hire defaults to on
- [ ] Vendor portal → Book Multiple → only enabled trip modes show as buttons
- [ ] Public site → About nav link goes to /services page
- [ ] Public site → Contact nav link goes to /contact page; form submission works and shows success state
- [ ] Admin → Enquiries → "Contact Enquiries →" button visible; contact form submissions appear there
- [ ] Contact form submission → email notification sent to admin notification email

---

### Previous v1.9.1 post-deploy verification
- [ ] Log into vendor portal → nav bar appears immediately (no refresh required)
- [ ] Visit Vendor → Bookings → New → Multiple
- [ ] See trip mode toggle: "Taxi Trips" vs "Vehicle Hire"
- [ ] Click "Vehicle Hire" → table shows Start Date, End Date, Vehicle*, Client, Notes columns
- [ ] Click calendar day → adds a vehicle hire row with start_date = end_date = clicked day
- [ ] Edit start_date and end_date → separate date pickers work
- [ ] Click "Taxi Trips" → table switches to original format (Date, Service, Vehicle, Pickup address*, Time*, Pax*, Destination, Return, Client, Notes)
- [ ] Click calendar day → adds a taxi row with date = clicked day
- [ ] Add at least 2 rows in either mode → "Authorised By" field appears below table (required field with validation)
- [ ] Submit without "Authorised By" → error message shows "Authorised By is required"
- [ ] Fill in "Authorised By" → error clears
- [ ] Submit bookings → redirected to bookings list
- [ ] Check admin email → ONE summary email received (not N individual emails) with table of all bookings, "Authorised By" footer

---

# Changelog / Release Notes

## v1.15.3 — 2026-07-22

### Invoice payment details

- Adds a multiline **Payment details / invoice footer** field under invoice identity and tax settings
- Supports `{{invoice_number}}`, replaced with the invoice reference on-screen and in printed/PDF invoices
- Stores the footer in the existing `Setting` table so it applies immediately without SQL changes

### Void invoice deletion

- Adds **Delete permanently** to void invoices only
- Rejects deletion when any payment or allocation exists
- Deletes invoice lines transactionally, keeps the booking available for reinvoicing, adjusts related bill-run totals, and retains a standalone deletion audit event

### Deferred scope

- Editable invoice/email templates, preview/test sending, explicit sending and PDF attachments move to v1.15.4

### Deployment

- No SQL, environment-variable, dependency or cron changes
- Retain the corrected v1.15.1 root `app.js` when installing the v1.15.3 OTA bundle
- Curated notes: `RELEASE-NOTES-v1.15.3.md`

## v1.15.2 — 2026-07-22

### Vendor billing cutover

- Limits vendor bill-run and single-invoice eligibility to hires starting on or after 2026-07-01
- Keeps every eligible unclaimed booking outstanding until it is invoiced, regardless of earlier bill-run cutoffs
- Clarifies the editable upper cutoff as **Include completed trips through**

### Single vendor-trip invoices

- Adds **Create single vendor invoice** to eligible completed vendor booking details
- Uses the same transactional ledger, recipient snapshot, idempotency and unique booking claim as consolidated bill runs
- Records the invoice creation source in the existing audit event and prevents the singly invoiced trip entering a later bill run

### Deployment

- No SQL, environment-variable, dependency or cron changes
- Retain the corrected v1.15.1 root `app.js` when installing the v1.15.2 OTA bundle
- Curated notes: `RELEASE-NOTES-v1.15.2.md`

## v1.15.0 — 2026-07-18

### New features

**Native billing and vendor bill runs**
- Replaced the one-booking invoice prototype with a native cents-based ledger for invoices, lines, payments, allocations, bill runs, and audit events
- Completed, priced vendor bookings now enter a reviewed billing queue and can be consolidated into one draft invoice per vendor
- Added direct booking invoices, issue/void controls, full and partial payment recording, paid balances, overdue display, and printer-friendly invoice detail
- Added issuer/vendor billing profiles, immutable invoice snapshots, and optional tax-inclusive GST calculation
- Added transactional row locks, unique active booking claims, and idempotency replay protection to prevent duplicate invoices or payments
- Bill-run confirmation locks only the exact reviewed booking snapshots and returns `billing_review_stale` instead of silently adding or repricing work after review
- Preserves any prototype table as `InvoiceLegacyBackup` during deployment and migrates compatible history without dropping the backup

**Contact enquiries**
- Added a public contact form with admin email notification
- Added contact-enquiry management under Admin → Enquiries, including status filters and mark-as-read handling
- Updated the public About and Contact navigation destinations

### Admin and vendor improvements

- Rebuilt Admin Quick Add, enquiry conversion, status changes, blockouts, and vehicle writes on shared transactional services with stricter validation
- Added idempotent Admin Quick Add submission so network retries cannot create duplicate bookings
- Reduced vendor multi-booking startup requests and client-side recalculation by returning consolidated calendar/options data
- Added bounded booking/calendar reads and shared date-window navigation for large datasets
- Added vendor billing-profile controls for billing identity, terms, currency, and enable/disable state
- Booking status tabs now filter the complete admin/vendor dataset in SQL and preserve the filter through pagination
- Fleet-wide blockouts now appear in vendor multi-booking availability and prevent selecting globally unavailable dates

- Added “Login as Vendor” from the admin vendor detail page
- Added clear inline feedback when changing a vendor username

### Bug fixes

- Reduced booking-detail database work and isolated optional invoice metadata so rapid multi-tab use is less likely to time out or return a 500
- Fixed inconsistent booking response mapping, date-window behaviour, driver trip parsing, and status/completion timestamps
- Fixed prototype invoice cents/dollars handling and replaced unsafe direct paid-status changes with payment ledger entries
- Centralised Microsoft token refresh to avoid competing refresh writes and intermittent calendar/email failures
- Fixed booking currency snapshots so vehicle work retains the vehicle currency and no-vehicle vendor work retains the vendor billing currency
- Kept internal bill-run notes off customer-visible invoice printouts and made void balances clearly non-payable
- Preserved Admin Quick Add idempotency keys across ambiguous upstream failures and surfaced status-update conflicts to staff

- Fixed the contact page client/server component boundary
- Fixed invoice date serialisation

### Performance and reliability

**v1.15 stability and diagnostics**
- Added slow-query timing and authenticated database diagnostics without exposing credentials or raw customer data
- Reduced booking-detail query fan-out, cached low-volatility driver metadata, and made optional billing metadata fail gracefully
- Added shared API error handling and canonical booking mapping to reduce route drift
- Added daily expiry cleanup for idempotency records through the existing email-sequences cron
- Vendor bill runs load issuer settings once and allocate invoice references in one atomic block, reducing invoice-creation SQL from approximately `6N` calls to `3N + 3` for `N` vendor invoices

**Transactional booking creation**
- Public, vendor single-booking, and vendor bulk-booking creation now validate availability and write each booking inside a database transaction
- Vehicle rows are locked while conflicts are checked, preventing two simultaneous requests from reserving the same vehicle and dates
- Vendor client ownership, date ranges, trip detail JSON, service types, and bulk request sizes are validated before records are written
- Notifications, calendar sync, and push delivery now run after the booking transaction commits

**Atomic public references**
- Replaced repeated table-wide `MAX(...)` reference scans with the `PublicIdSequence` counter table
- Concurrent requests can no longer allocate the same public booking, vehicle, vendor, driver, enquiry, invoice, or contact reference

**Lower database overhead**
- Removed N+1 count queries from admin vendor, driver, and vendor-client lists
- Consolidated admin dashboard statistics into aggregate queries with accurate full-dataset totals
- Added composite indexes for booking availability and vehicle blockout date checks
- Public homepage vehicle data now uses a short revalidation window instead of forcing a database query on every request

### Maintainability

- Added shared transaction, booking-availability, signed-token, settings, API, and repository helpers
- Consolidated duplicated admin, vendor, and driver JWT signing and verification code
- Added batched settings reads/writes and request-scoped branding reuse
- Added canonical booking creation response types and safer driver trip-details parsing
- Added an ESLint configuration so validation runs non-interactively

### Deployment notes

- This is a schema cutover: run the v1.15.0 migration with writes paused before starting the new build
- Back up and preserve any prototype invoice data as `InvoiceLegacyBackup`; do not deploy the new code against the old Invoice shape
- Apply/verify all genuinely outstanding pre-v1.15 SQL, including public-ID sequences and availability indexes
- No new environment variables are required, but `CRON_SECRET` and the daily email-sequences cron must already be active
- Use [BILLING-MVP.md](BILLING-MVP.md) for billing rules and staff acceptance testing
- Use [RELEASE-NOTES-v1.15.0.md](RELEASE-NOTES-v1.15.0.md) as the curated GitHub release notes

---

## v1.14.3

### Bug fix

**Vendor multi-booking calendar showing wrong vehicle availability**

The calendar was only checking the logged-in vendor's own bookings to determine which dates/vehicles were unavailable. Bookings made by other vendors or admins for the same vehicles were invisible, allowing double-booking attempts.

Fixed by adding a new auth-gated endpoint `GET /api/vendor/bookings/availability` that returns all confirmed/pending bookings with a vehicle assigned, across all vendors and admin — the same global view the public booking site uses. Per-vehicle blockouts are also included.

The vendor multi-booking page now fetches this global data separately alongside its own bookings:
- Own bookings (`/api/vendor/bookings`) → used for the sidebar list only
- Global availability (`/api/vendor/bookings/availability`) → used for the calendar unavailability indicators and date blocking

No DB changes required.

---

## v1.14.2

### Bug fix

**Calendar not syncing for bookings created directly as confirmed**
- Bookings created via Admin → Quick Add were never synced to Microsoft Calendar because the `syncBookingToCalendar` call was missing from the creation route — it only existed on the status-change route
- Fixed: `syncBookingToCalendar(id)` is now called immediately after INSERT in `POST /api/admin/bookings` whenever a `vehicle_id` is present, matching the pattern already used by the vendor single and bulk booking routes
- No changes needed for vendor routes — they already called `syncBookingToCalendar` on creation

No DB changes required.

---

## v1.14.1

### Changes

**Vendor multi-booking — calendar availability indicators**

*"Choose per row" (individual vehicle) mode:*
- Dates where any of the vendor's vehicles are already booked now show a subtle orange tint and an orange dot indicator
- Hovering over such a date shows a styled tooltip bubble listing each unavailable vehicle by name in bold red text under "Vehicles Unavailable"
- Vendors can still click and add a booking on those dates (different vehicles may still be available)

*"Same for all" (same vehicle) mode:*
- Once a vehicle is selected, dates where that specific vehicle is already booked are highlighted in red with a strikethrough date number
- Those dates are unclickable — attempting to select them has no effect
- A "Booked" indicator is added to the calendar legend

**Removed: waitlist enquiry prompt on conflict**
- The amber "submit as waitlist enquiry" prompt has been removed
- Conflicts are now surfaced visually on the calendar before booking is attempted, making the prompt redundant

### Technical
- `src/components/vendor/MultiDayPicker.tsx` — new `unavailableVehiclesByDate` and `blockedDates` props; fixed-position hover tooltip; blocked date tile styling
- `src/app/vendor/bookings/new/multi/page.tsx` — `ExistingBooking` interface now includes `end_date`, `vehicle_id`, `vehicle_name`; `expandDateRange` helper; `unavailableVehiclesByDate` and `blockedDates` computed per mode; `conflictPrompt` and `submitConflictsAsEnquiries` removed

---

## v1.14.0

### New features

**Bug report button**
- New "Report Bug" button in the admin top bar (icon on narrow screens, labelled on wide)
- Opens a modal — enter a title and description; page URL, viewport size, and browser string are captured automatically
- Submits directly to the private GitHub repo as an issue with labels `bug` and `admin-portal-report`
- Labels are created automatically on first use if they don't exist
- Success screen shows the issue number and a direct link to GitHub

**Admin profile page**
- `/admin/profile` now loads correctly (was previously a 404)
- Accessible via the user dropdown → Profile Settings
- Shows username and role; master admin sees a note that their password is in env vars
- Additional admin users can change their password via the form

### Bug fixes

**Customers — total spend showing 10× too high**
- `SUM(total_cost)` from mysql2 returns a string; adding `+ 0` (from the alias fallback) caused JS string concatenation rather than numeric addition — e.g. `"15000" + 0 = "150000"` — then dividing by 100 gave 10× the correct value
- Fixed by wrapping in `Number()` before addition

### Technical
- `src/app/admin/customers/page.tsx` — `Number(c.total_spend)` and `Number(aliasCustomer.total_spend)`
- `src/app/admin/profile/page.tsx` + `AdminProfileForm.tsx` — new server/client profile page
- `src/app/api/admin/profile/route.ts` + `password/route.ts` — profile GET + password POST
- `src/app/api/admin/bug-report/route.ts` — GitHub Issues API integration
- `src/app/admin/BugReportModal.tsx` — modal UI
- `src/app/admin/AdminTopBar.tsx` — bug report button wired in

---

## v1.13.0

### New features

**Vendor username editing**
- Admins can now change a vendor's username directly from the vendor detail page
- Click Edit next to the username field, enter the new username, then Confirm
- Uniqueness is validated server-side — duplicate usernames are rejected with a clear error

**Per-vendor service type toggles**
- Each vendor now has independent on/off toggles for Taxi Trips and Vehicle Hire
- Taxi Trips defaults to off; Vehicle Hire defaults to on
- Vendor portal → Book Multiple respects these toggles — disabled modes are hidden from the trip type selector

**Bulk booking conflict → waitlist enquiry prompt**
- When bulk bookings fail because a vehicle is already booked, a single amber prompt now appears offering to submit all conflicting bookings as waitlist enquiries
- Previously the user saw individual error messages with no follow-up action
- Submitting as enquiries uses the same `is_enquiry = 1` flag; these are handled as standard waitlist bookings
- Partial batches (some succeeded, some conflicted) are handled gracefully — confirmed bookings are recorded, conflict prompt appears for the rest

### Technical
- `src/app/api/admin/vendors/[id]/route.ts` — PATCH now handles `username` (uniqueness check), `taxi_enabled`, `vehicle_hire_enabled`
- `src/app/api/vendor/settings/route.ts` — new endpoint returning `taxi_enabled`/`vehicle_hire_enabled` for the logged-in vendor
- `src/app/vendor/bookings/new/multi/page.tsx` — refactored submit into `buildBookingPayloads`, `handleSubmit`, `submitConflictsAsEnquiries`; conflict prompt UI added
- New DB columns: `Vendor.taxi_enabled` (TINYINT DEFAULT 0), `Vendor.vehicle_hire_enabled` (TINYINT DEFAULT 1)

---

## v1.12.0

### New features

**Email templates — separate admin/customer versions**
- `booking_confirmed`, `reminder_24hr`, and `followup` templates now have separate Admin and Customer variants editable in Settings → Templates
- Each uses a different `BookingEmailLog` key so they are tracked independently
- Both default to the same content — edit the Admin version to send internal-style notifications

**Batch booking summary — editable template + vendor receives copy**
- Batch booking summary email is now editable in Settings → Templates as "Batch Booking Summary (Admin + Vendor)"
- Supports: `{{vendor_name}}`, `{{booking_count}}`, `{{booking_count_plural}}`, `{{trip_mode}}`, `{{bookings_table}}`, `{{authorised_by}}`, `{{site_name}}`
- Vendor's contact email now receives a copy alongside the admin notification email

**Email template editor — full-width split layout**
- Editor and live preview now fill the screen side-by-side (50/50) on wide screens; stacked on mobile
- Other settings pages retain the 640px constrained width

**Vendor bookings → automatically confirmed**
- Vendor-created bookings (single and bulk) are now inserted as `confirmed` instead of `pending`
- Booking confirmed email is sent instead of "new booking received" for single bookings

**Double booking prevention**
- Vendor single and bulk booking routes now check for overlapping confirmed/pending bookings on the same vehicle before inserting
- Returns `409 Conflict` with message "Vehicle is already booked for those dates" if a conflict is found

### Technical
- `email-template-defaults.ts` — added `booking_confirmed_admin`, `reminder_24hr_admin`, `followup_admin`, `bulk_booking_summary` entries
- `email-sequences.ts` — `sendBookingConfirmed`, `sendDue24hrReminders`, `sendFollowups` now send separate templates per recipient type
- `email.ts` — `sendBulkVendorBookingSummary` now accepts `vendorEmail?`, uses DB template, sends to both recipients
- `src/app/admin/settings/layout.tsx` — max-width removed from layout; moved to individual forms

---

## v1.11.0

### New features

**Admin Quick Add — Vendor assignment**
- Vendor dropdown added to the Quick Add Booking form (below Dates)
- Selecting a vendor pre-fills the contact email and phone from the vendor's account details
- Booking is tagged to the vendor's account and appears in their portal

**Vendor portal name — separate from admin portal**
- Admin → Settings → General now has a dedicated "Vendor Portal Name" field
- Allows different names to show in the header of the admin vs vendor portals (useful when both are open in tabs)
- Falls back to Admin Portal Name if blank, preserving existing behaviour

### Bug fixes

**Vendor portal — `contact_email cannot be null` on booking creation**
- When a vendor created a booking without linking a client, `contact_email` was inserted as `null`, causing a DB constraint error
- Fixed: both the single (`POST /api/vendor/bookings`) and bulk (`POST /api/vendor/bookings/bulk`) routes now fetch the vendor's own `contact_email` and `contact_phone` as a final fallback

**Vendor portal — Client column removed from Vehicle Hire bulk form**
- Vehicle Hire rows in the multi-booking table previously showed a Client dropdown that had no effect (contact details were not sourced from client for hire bookings)
- Removed from Vehicle Hire table header and row; client dropdown remains in Taxi Trips rows as before

### Technical
- `src/lib/site.ts` — new `getVendorPortalName()` exported function; reads `vendor_name` setting, falls back to `admin_name`
- `src/app/vendor/layout.tsx` — uses `getVendorPortalName()` instead of `getAdminName()`
- `src/app/admin/settings/GeneralForm.tsx` / `page.tsx` — `vendor_name` key added to settings query and save

---

## v1.10.0

### New features

**Microsoft 365 Calendar Sync**
- Bookings now sync automatically to the connected Outlook calendar when created, updated, or deleted
- Events are colour-coded by status: Yellow = Pending, Green = Confirmed, Red = Cancelled, Blue = Completed, Purple = Enquiry
- Create and update use MS Graph API (`POST /me/events`, `PATCH /me/events/{id}`)
- 404 recovery: if an event was deleted from Outlook, a new one is created automatically on next sync
- Requires reconnecting MS 365 in Admin → Settings → Connections to grant the new `Calendars.ReadWrite` scope

**Google Calendar removed**
- Google Calendar integration has been removed; Microsoft 365 is the sole calendar integration
- `gc-auth`, `gc-callback`, `gc-disconnect` API routes removed
- Google Calendar tile removed from Settings → Connections

**Remember Me — 30-day persistent login**
- All three portals (Admin, Vendor, Driver) now show a "Remember me for 30 days" checkbox on the login page
- When checked, the session cookie `max-age` is set to 30 days instead of the default 8 hours
- JWT expiry is extended to match the cookie lifetime

**Date format standardisation (en-AU)**
- All dates across admin and driver portals now display in Australian format (e.g. "9 Apr 2026")
- Fixed 5 pages that were missing the `'en-AU'` locale on `toLocaleDateString` / `toLocaleString`
- Fixed 3 list views that were showing raw `YYYY-MM-DD` database strings instead of formatted dates

### Bug fixes

**Vendor portal — bookings showing from other vendors**
- Dashboard and booking list were including bookings from all vendors due to an overly broad SQL filter
- Fixed: query now strictly filters by `vendor_id = ?`

**Vendor portal — View button returning 404**
- Was a downstream effect of the above — foreign bookings failing the detail page auth check
- Resolved by the vendor isolation fix above

**Vendor portal — multi-booking form not saving**
- Bookings were being created in the DB but the success redirect hit a redirect stub, giving zero feedback
- Fixed: replaced redirect with an in-page success screen showing created count and any errors

**CrazyTel dispatch number not persisting**
- SQL `IN` clause had 6 placeholders for 7 values — `crazytel_dispatch_number` was silently dropped from the query
- Fixed: corrected to 7 placeholders

### Technical

- `src/lib/calendar.ts` — rewritten to MS Graph only; `syncBookingToCalendar` and `deleteCalendarEvent` updated
- MS OAuth scope updated: `Calendars.ReadWrite offline_access` added to both auth and callback routes
- `Booking.ms_event_id` column added to schema
- `Booking.google_event_id` column removed from schema

---

## v1.9.2

### New features
- **PWA / installable booking app**: Customers can now add `/book` to their home screen on iOS and Android — opens in standalone mode (no browser chrome) like a native app
- **Dynamic app icon**: Icon is generated server-side from the configured PWA icon, falling back to site logo, then first letter of site name — fully white-label
- **App Icon upload**: New field in Admin → Settings → General to upload a dedicated app icon (PNG/JPG/WebP, 512×512 recommended)
- **Web app manifest** auto-injected into all pages (`display: standalone`, `scope: /book`, `start_url: /book`)
- **iOS standalone support**: `apple-mobile-web-app-capable` meta added to root layout
- **Fix**: Title template in `/book` layout was hardcoded to `CKB` — now uses dynamic site name

---

## v1.9.1

### Bug fixes

**Vehicle Hire bulk submission not saving bookings**
- Bulk API was returning HTTP 207 (Multi-Status) when bookings failed, which the client treated as success (`res.ok === true` for 2xx), silently swallowing errors and redirecting with 0 created
- Fix: return 400 when all bookings fail; client now checks `d.errors` and shows messages instead of blindly redirecting

**CrazyTel dispatch number not saving**
- "Done" button on dispatch number (and from number) edit only toggled edit state, never triggered `handleSave()`
- Fix: "Done" replaced with "Save" (triggers save) + "Cancel" (reverts to original value)

### UX improvements

**Vehicle Hire — "Same vehicle for all" mode**
- New toggle next to Vehicle Hire button: "Same for all" vs "Choose per row"
- "Same for all": single vehicle dropdown above the table; vehicle column removed from rows
- "Choose per row": vehicle dropdown appears per row (original behavior)

**Trip mode buttons redesigned**
- Taxi Trips / Vehicle Hire buttons now larger (15px font, padded, border-2) and positioned above calendar for prominence

**Authorised By + Submit consolidated**
- "Authorised By" field and submit button now grouped in a card below the booking table for clear visual flow

---

## v1.9.0

### New features

**Vendor Portal — Trip Type Picker & Vehicle Hire Mode**
- Multi-booking form now has trip mode toggle: Taxi Trips vs Vehicle Hire
- **Vehicle Hire mode**: simplified form collecting only vehicle, start/end dates, optional client, notes
- **Taxi mode**: existing flow (pickup address, time, passengers, destination, return trip)
- Both modes use the shared calendar to select booking dates
- Switching modes resets all entered rows (safety against mixing trip types)

**Vendor Portal — Booking Audit Trail**
- New "Authorised By" field (required) on multi-booking form
- Captures the name of the person authorising the bookings
- Stored in each booking's `trip_details` JSON for audit purposes
- Validation prevents submission if field is empty

**Vendor Portal — Bulk Booking Email**
- Multi-booking submissions now send a single consolidated summary email instead of N individual emails
- Summary email includes:
  - Booking count and trip type
  - Table of all bookings (Ref, Vehicle/Service, Start Date, End Date, Days)
  - "Authorised By" footer with the authoriser's name
- New `POST /api/vendor/bookings/bulk` endpoint handles batch creation + single summary email

### Bug fixes

**Vendor Portal — Nav Bar on Login**
- Fixed nav bar not appearing until manual refresh after login
- Root cause: `router.refresh()` was called before `router.push()`, causing the Next.js router cache to be invalidated after navigation completed
- Solution: replaced sequential refresh+push with hard `window.location.href` redirect, guaranteeing full page load with fresh cookie

---

## v1.8.2

## v1.8.2

### Security fixes
- **Booking confirmation URL privacy**: Customer details (name, email, phone) no longer passed in URL query params; confirmation page now fetches booking from database using only booking ID
- **Phone number sanitization**: SMS now strips spaces from phone numbers before sending (fixes delivery for numbers entered as `0408 597 621`)

### UX improvements  
- **CrazyTel settings masking**: API keys display as masked (••••••••) with "Edit" button; phone numbers show actual value with "Edit" button when saved
- **Settings edit pattern**: Clear separation between view mode (masked/protected) and edit mode (input fields)
- **Better for white-label**: Non-technical users can see what's configured without risk of accidental changes

---

## v1.8.1

### Fixes
- **Vendor login — nav bar loading**: Added `router.refresh()` before navigation to invalidate Server Component cache, preventing stale nav bar on first login

### UX improvements
- **Vendor dashboard redesign**: Combined dashboard + bookings into a single page
  - Compact stat bar replaces 4-card grid (Bookings This Month, Pending, Active Clients)
  - Full bookings list with status tabs always visible instead of 5-row preview
  - "+ Bookings" button moved to header
- **Vendor nav cleanup**: Removed redundant "Bookings" link (now redirects to dashboard)

---

## v1.8.0(d) — hotfix

### Fixes
- **Taxi booking confirm — map route**: Route line now displays on the confirmation page (was missing `routeGeometry` prop to `<TaxiMap>`)
- **Taxi bookings — admin list**: Now show "Taxi Request" instead of "Unknown Vehicle" and "Taxi" instead of "Chauffeured"
- **Taxi bookings — admin detail**: Heading now shows "Taxi Request" and hire type shows "Taxi"
- **CrazyTel SMS — error visibility**: When SMS API returns an error without a `message` or `error` field, the raw response body is now shown in the test SMS error message, making it easier to diagnose (bad key, unverified number, etc.)

---

## v1.8.0(c) — pending

### Changes
- **Booking app — editable pickup**: `/book/taxi` now shows combined pickup+destination card; pickup is editable with address search and a locate-me button to revert to GPS
- **Booking app — satellite toggle**: Map/Satellite toggle button on all taxi map screens
- **Booking app — confirm flow simplified**: No ETA or route calculation; map shows pins only; submits directly to Booking Received screen
- **Booking app — Booking Received screen**: Clean confirmation with booking ref, route summary, phone callback note, and amber info note
- **API `/api/booking/taxi`**: Removed mandatory `distance_m`/`duration_s`/`fare_cents`; now returns `public_id`

---

## v1.8.0(b) — pending

### Fixes
- **Book Multiple — service type picker**: selecting Taxi/CPV/Vehicle now works correctly (two racing `set()` calls merged into a single `onChange`)
- **Book Multiple — compact table layout**: replaced tall per-booking cards with a dense single-row-per-booking table; horizontally scrollable on small screens

---

## v1.8.0 — pending

### New features

**Vendor — Book Multiple**
- New "Book Multiple" button on Vendor → Bookings alongside the existing "+ New Booking"
- Opens `/vendor/bookings/new/multi` — a fast multi-day booking flow
- Calendar shows existing bookings as amber (pending) / green (confirmed) dot indicators with hover tooltip of booking refs
- Click any day to add a booking row; click the same day again to add a second booking for that day
- Each row is independently configurable: service type, pickup address (required), pickup time (required), passengers (required), destination, return trip toggle + return time, optional client, optional notes
- Red × on each row removes it
- "Create X Bookings" button submits all rows sequentially with live progress indicator
- All trip details stored in `trip_details` JSON column on the Booking record

### Technical
- New component: `src/components/vendor/MultiDayPicker.tsx`
- New page: `src/app/vendor/bookings/new/multi/page.tsx`
- API update: `POST /api/vendor/bookings` now accepts and stores `trip_details`; `contact_name` no longer required (optional for multi-booking flow)

---

## v1.7.2 — pending

### Fixes

**CrazyTel SMS — correct API endpoint**
- Fixed SMS send endpoint: now uses `https://sms.crazytel.net.au/api/v1/sms/send` with `Authorization: Bearer` header and JSON body `{to, from, message}`
- Previous endpoint (`crazytel.io`) was incorrect and returned 401/403

**CrazyTel — account info & DID dropdown**
- CrazyTel tile in Settings → Connections now fetches account info after API key is saved
- Shows masked email (e.g. `j***@example.com`) and account balance as a status card
- From number is now a dropdown populated from numbers/DIDs on the CrazyTel account (falls back to text input if account info unavailable)
- New API endpoint: `GET /api/admin/settings/crazytel/account`

---

## v1.5.0 — released

### New features

**Availability & Blockout Date Management**
- Admins can now block date ranges per vehicle or fleet-wide from Admin → Blockouts
- Fleet-wide blockouts prevent all vehicles from being booked during the period
- Per-vehicle blockouts also manageable directly on each vehicle's edit page
- Blocked dates appear as grey bars on the admin calendar
- Public booking app and per-vehicle booking pages both respect blockouts
- Blockout reason is internal-only — not visible to customers

**Automated Email Sequences**
- Customers now receive an automatic confirmation email when a booking is submitted (Booking Received)
- Customers + admin notification email receive a confirmation when booking is set to Confirmed
- Daily cron sends 24hr reminders to customer + admin the day before a confirmed booking starts
- Daily cron sends a post-trip follow-up to customer + admin the day after a booking ends
- All sequences are idempotent — duplicate sends are prevented via BookingEmailLog
- All 4 new email templates are editable via Admin → Settings → Email Templates

**Customer Profiles & Booking History**
- New Admin → Customers section lists all customers grouped by email with booking count, total spend, and last booking date
- Per-customer page shows full booking history with booking refs, vehicle, dates, cost, and status
- Admin can add and delete private internal notes per customer (not visible to customers)

**Enquiry Pipeline**
- New Admin → Enquiries section lists all waitlist enquiries with filter tabs: New, Contacted, Converted, Lost
- Each enquiry has status tracking managed from the booking detail page
- Actions: Mark as Contacted, Notify Customer (sends "dates available" email), Convert to Booking, Mark as Lost
- "Convert to Booking" promotes the enquiry to a pending booking seamlessly
- New "Enquiry — Dates Now Available" email template editable via Admin → Settings → Email Templates

**Customer Enhancements**
- Vendor customer bookings now visible in Admin → Customers (already stored in Booking table)
- Archive/hide a customer from the customer list (booking records are preserved)
- Link multiple email addresses to the same customer profile (admin-only — vendors cannot see linked profiles)
- Linked profiles: merged booking counts and history shown on the primary customer's detail page

### Technical
- New DB tables: `VehicleBlockout`, `BookingEmailLog`, `CustomerNote`, `CustomerArchive`, `CustomerAlias`
- New Booking column: `enquiry_status` (VARCHAR 20, default 'new')
- New env var: `CRON_SECRET`
- New cron endpoint: `POST /api/cron/email-sequences` (Bearer token auth)

---

## v1.6.0 — released

### New features

**Service Feature Toggles (Dispatch Settings)**
- New Admin → Settings → Dispatch page for enabling/disabling per-service features
- Toggleable features: Trip ratings, rating comments, trip sharing, live tracking — per service type (taxi, rideshare, self-drive, chauffeured)
- Changes take effect immediately, cached 60s for public API

**Trip Ratings**
- Customers can rate their trip after completion (1–5 stars) — if enabled in Dispatch settings
- Optional comment field (also toggleable)
- Ratings stored in `TripRating` table, one per booking

**Multi-service Booking App**
- /book redesigned with a service picker (Taxi, Rideshare, Self-Drive, Chauffeured)
- Vehicle hire flow moved to /book/hire — old /book/[slug] URLs auto-redirect
- Taxi flow: 5-screen flow (home → destination → confirm → ride → complete) with MVP placeholder UI

### Technical
- New DB tables: `ServiceFeature` (10 seed rows), `TripRating`
- New public endpoint: `GET /api/service-features?service_type=taxi` (cached 60s)
- New admin endpoints: `GET/PATCH /api/admin/service-features`
- New public endpoint: `POST /api/booking/[id]/rating`
- New client hook: `useServiceFeatures(serviceType)` in lib/hooks

---

## v1.7.1 — pending

### New features

**CrazyTel SMS Integration**
- New SMS integration via CrazyTel API (`POST /api/v1/sms/send`)
- API key, from number, and dispatch number configurable in Admin → Settings → Connections
- On taxi booking confirm: SMS sent to customer (confirmation + ETA + ref) and to dispatch number (booking summary)
- SMS not sent if CrazyTel is not configured or disabled — fully non-blocking

**Configurable Notification Templates**
- Admin → Settings → Templates redesigned as a unified list of all 9 notifications (7 email + 2 SMS)
- Each template has an enable/disable toggle (saves immediately) and an Edit button
- Edit opens an inline panel: HTML editor + live preview for email; plain text editor + char/segment counter for SMS
- SMS template variables: `{{contact_name}}`, `{{contact_phone}}`, `{{pickup}}`, `{{destination}}`, `{{eta_mins}}`, `{{booking_ref}}`
- Taxi customer and dispatch SMS messages fully editable and independently toggleable

**Connections Page — App Picker UI**
- Admin → Settings → Connections redesigned as a grid of integration tiles
- Tiles: Microsoft 365, Google Calendar, SMTP, Web Push, CrazyTel SMS — each showing connection status
- Click a tile to expand its configuration panel; click again to collapse
- OAuth callbacks (MS/GC) auto-open the relevant tile

**Booking App Fixes**
- /book splash screen now shows the actual site logo from Admin → Settings → General
- /book/taxi: map starts zoomed out over Kerang/Cohuna/Barham region; centres on user location when geolocation resolves
- /book/taxi: removed hardcoded recent places and Home/Work saved place options
- /book/taxi/confirm: shows nearest taxi base (Cohuna/Kerang/Koondrook) based on Haversine distance; fare estimate removed
- /book/taxi/ride: mock driver details removed; replaced with generic "Your taxi is on the way"
- /book/taxi/complete: fare and mock driver row removed; rating widget shown inline
- Map full-screen height fixed on desktop (`lg:h-screen` + `lg:h-full` on all taxi screens)

### Technical
- New files: `src/lib/sms.ts`, `src/lib/sms-templates.ts`, `src/lib/sms-template-defaults.ts`
- New API: `GET/PATCH/POST /api/admin/settings/crazytel`
- SMS template bodies stored in `Setting` table: `sms_template_taxi_customer`, `sms_template_taxi_dispatch`
- Enable flags stored in `Setting` table: `*_enabled` keys (default enabled if not set)
- No new DB tables or schema changes required

---

## v1.7.0 — released

### New features

**Functional Taxi Flow**
- /book/taxi now uses a real Mapbox GL map with live geolocation
- Desktop: split layout (map left, controls right) — no phone frame
- Live address search via Mapbox Geocoding API (debounced, AU-only)
- Route calculation via Mapbox Directions API — real distance, ETA, fare
- Fare formula: max($8.00, $3.50 + distance_km × $2.20)
- Confirm screen creates a real Booking record in the database
- Ride screen shows countdown ETA with progress bar
- Complete screen loads real trip data from DB; submits rating to TripRating table

**Admin Settings Navigation**
- Settings tabs replaced sidebar nav with horizontal tab strip for better mobile usability

### Technical
- New packages: `react-map-gl`, `mapbox-gl`, `@types/mapbox-gl`
- New env var: `NEXT_PUBLIC_MAPBOX_TOKEN` (public Mapbox access token)
- New endpoint: `POST /api/booking/taxi` (public, creates Booking with service_type='taxi')
- New components: `TaxiMap`, `useMapboxSearch`, `useRoute` hooks
- `book/layout.tsx` simplified — phone frame removed
