-- cPanel: select the production database first and back it up before running.
-- Requires Vehicle to use InnoDB with id VARCHAR(191), utf8mb4_unicode_ci.
-- Repairs the partial 0004 upgrade where FleetCategory is MyISAM and the
-- VehicleFleetCategory CREATE failed with #1071. Also supports absent categories.
-- Do not edit already-applied migration 0004: container installs track checksums.
-- Existing correct InnoDB tables and category/assignment data are retained.

CREATE TABLE IF NOT EXISTS `FleetCategory` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `homepage_group` VARCHAR(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `FleetCategory_name_key` (`name`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FleetCategory` ENGINE=InnoDB, ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `VehicleFleetCategory` (
  `vehicle_id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`vehicle_id`, `category_id`),
  CONSTRAINT `VehicleFleetCategory_vehicle_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle` (`id`) ON DELETE CASCADE,
  CONSTRAINT `VehicleFleetCategory_category_fkey` FOREIGN KEY (`category_id`) REFERENCES `FleetCategory` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Do not replace an existing Bus category or reset its configuration.
INSERT INTO `FleetCategory` (`id`, `name`, `homepage_group`)
SELECT 'bus', 'Bus', 'buses'
WHERE NOT EXISTS (
  SELECT 1 FROM `FleetCategory` WHERE `id` = 'bus' OR `name` = 'Bus'
);
