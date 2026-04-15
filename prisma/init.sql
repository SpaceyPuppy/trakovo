-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `public_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `price` INTEGER NOT NULL DEFAULT 0,
    `price_poa` BOOLEAN NOT NULL DEFAULT false,
    `chauffeur_price` INTEGER NOT NULL DEFAULT 0,
    `chauffeur_price_poa` BOOLEAN NOT NULL DEFAULT false,
    `day_rates` TEXT DEFAULT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AUD',
    `hire_modes` VARCHAR(191) NOT NULL DEFAULT 'chauffeured_only',
    `passengers` VARCHAR(191) NOT NULL DEFAULT '',
    `transmission` VARCHAR(191) NOT NULL DEFAULT 'Automatic',
    `fuel` VARCHAR(191) NOT NULL DEFAULT 'Petrol',
    `is_available` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_public_id_key`(`public_id`),
    UNIQUE INDEX `Vehicle_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleMedia` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `content_type` VARCHAR(191) NOT NULL DEFAULT 'image/jpeg',
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `public_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NULL,
    `hire_type` VARCHAR(191) NOT NULL,
    `service_type` VARCHAR(191) NOT NULL DEFAULT 'vehicle',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `start_date` VARCHAR(191) NOT NULL,
    `end_date` VARCHAR(191) NOT NULL,
    `total_days` INTEGER NOT NULL,
    `daily_rate` INTEGER NOT NULL,
    `total_cost` INTEGER NOT NULL,
    `contact_name` VARCHAR(191) NULL,
    `contact_email` VARCHAR(191) NOT NULL,
    `contact_phone` VARCHAR(191) NOT NULL,
    `driver_name` VARCHAR(191) NULL,
    `driver_dob` VARCHAR(191) NULL,
    `driver_licence_number` VARCHAR(191) NULL,
    `driver_licence_expiry` VARCHAR(191) NULL,
    `agreement_accepted` BOOLEAN NOT NULL DEFAULT false,
    `id_document_path` VARCHAR(191) NULL,
    `licence_document_path` VARCHAR(191) NULL,
    `trip_details` TEXT NULL,
    `is_enquiry` BOOLEAN NOT NULL DEFAULT false,
    `ms_event_id` VARCHAR(191) NULL,
    `vendor_id` VARCHAR(191) NULL,
    `vendor_client_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingNote` (
    `id` VARCHAR(191) NOT NULL,
    `booking_id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `author` VARCHAR(191) NOT NULL DEFAULT 'Staff',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `endpoint` VARCHAR(500) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` VARCHAR(191) NOT NULL,
    `public_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `contact_email` VARCHAR(191) NOT NULL DEFAULT '',
    `contact_phone` VARCHAR(191) NOT NULL DEFAULT '',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vendor_public_id_key`(`public_id`),
    UNIQUE INDEX `Vendor_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorVehicle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vendor_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VendorVehicle_vendor_id_vehicle_id_key`(`vendor_id`, `vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorClient` (
    `id` VARCHAR(191) NOT NULL,
    `public_id` VARCHAR(191) NOT NULL,
    `vendor_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `reference` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorClient_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorEnquiry` (
    `id` VARCHAR(191) NOT NULL,
    `public_id` VARCHAR(191) NOT NULL,
    `vendor_id` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `booking_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `staff_reply` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorEnquiry_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactEnquiry` (
    `id` VARCHAR(191) NOT NULL,
    `public_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `message` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'new',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `ContactEnquiry_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VehicleMedia` ADD CONSTRAINT `VehicleMedia_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_vendor_client_id_fkey` FOREIGN KEY (`vendor_client_id`) REFERENCES `VendorClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingNote` ADD CONSTRAINT `BookingNote_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorVehicle` ADD CONSTRAINT `VendorVehicle_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorVehicle` ADD CONSTRAINT `VendorVehicle_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorClient` ADD CONSTRAINT `VendorClient_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorEnquiry` ADD CONSTRAINT `VendorEnquiry_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Tables added post-v1.3 ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `VehicleBlockout` (
  `id` VARCHAR(191) NOT NULL,
  `vehicle_id` VARCHAR(191) NULL,
  `start_date` VARCHAR(10) NOT NULL,
  `end_date` VARCHAR(10) NOT NULL,
  `reason` VARCHAR(191) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `VehicleBlockout_vehicle_idx` (`vehicle_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `BookingEmailLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `booking_id` VARCHAR(191) NOT NULL,
  `template_key` VARCHAR(191) NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `BookingEmailLog_unique` (`booking_id`, `template_key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CustomerNote` (
  `id` VARCHAR(191) NOT NULL,
  `contact_email` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `CustomerNote_email_idx` (`contact_email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CustomerArchive` (
  `email` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CustomerAlias` (
  `id` VARCHAR(191) NOT NULL,
  `primary_email` VARCHAR(191) NOT NULL,
  `alias_email` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CustomerAlias_alias_email_unique` (`alias_email`),
  INDEX `CustomerAlias_primary_email_idx` (`primary_email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Booking`
  ADD COLUMN IF NOT EXISTS `driver_id` VARCHAR(191) NULL AFTER `vendor_client_id`,
  ADD COLUMN IF NOT EXISTS `enquiry_status` VARCHAR(20) NULL DEFAULT 'new' AFTER `is_enquiry`;

ALTER TABLE `Vehicle`
  ADD COLUMN IF NOT EXISTS `public_bookings_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_available`,
  ADD COLUMN IF NOT EXISTS `vendor_bookings_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `public_bookings_enabled`,
  ADD COLUMN IF NOT EXISTS `licence_category` VARCHAR(10) NOT NULL DEFAULT '' AFTER `fuel`;

CREATE TABLE IF NOT EXISTS `CorporateEnquiry` (
  `id` VARCHAR(191) NOT NULL,
  `public_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `organisation` VARCHAR(191) NULL,
  `event_type` VARCHAR(100) NULL,
  `guests` VARCHAR(50) NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'new',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CorporateEnquiry_public_id_unique` (`public_id`),
  INDEX `CorporateEnquiry_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ServiceFeature` (
  `id`           VARCHAR(36) NOT NULL,
  `service_type` VARCHAR(32) NOT NULL,
  `feature_key`  VARCHAR(64) NOT NULL,
  `is_enabled`   TINYINT(1) NOT NULL DEFAULT 0,
  `config`       JSON DEFAULT NULL,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_feature` (`service_type`, `feature_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `ServiceFeature` (`id`, `service_type`, `feature_key`, `is_enabled`, `config`) VALUES
(UUID(), 'taxi',        'rating',         0, '{"max_stars":5,"mandatory":false}'),
(UUID(), 'taxi',        'rating_comment', 0, '{"max_length":500}'),
(UUID(), 'taxi',        'share_trip',     0, NULL),
(UUID(), 'taxi',        'live_tracking',  0, NULL),
(UUID(), 'rideshare',   'rating',         0, '{"max_stars":5,"mandatory":true}'),
(UUID(), 'rideshare',   'rating_comment', 0, '{"max_length":500}'),
(UUID(), 'rideshare',   'share_trip',     0, NULL),
(UUID(), 'rideshare',   'live_tracking',  0, NULL),
(UUID(), 'self_drive',  'rating',         0, '{"max_stars":5,"mandatory":false}'),
(UUID(), 'chauffeured', 'rating',         0, '{"max_stars":5,"mandatory":false}');

CREATE TABLE IF NOT EXISTS `Invoice` (
  `id`         VARCHAR(191) NOT NULL,
  `public_id`  VARCHAR(191) NOT NULL,
  `booking_id` VARCHAR(191) NOT NULL,
  `amount`     INTEGER NOT NULL,
  `currency`   VARCHAR(10) NOT NULL DEFAULT 'AUD',
  `status`     VARCHAR(20) NOT NULL DEFAULT 'draft',
  `due_date`   VARCHAR(10) NULL,
  `paid_at`    DATETIME NULL,
  `notes`      TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Invoice_public_id_unique` (`public_id`),
  UNIQUE INDEX `Invoice_booking_id_unique` (`booking_id`),
  INDEX `Invoice_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TripRating` (
  `id`         VARCHAR(36) NOT NULL,
  `booking_id` VARCHAR(191) NOT NULL,
  `stars`      TINYINT NOT NULL,
  `comment`    TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TripRating_booking_unique` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
