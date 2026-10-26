-- Apply once after checking that both tables are absent. Do not rerun the seed.
CREATE TABLE `FleetCategory` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `homepage_group` VARCHAR(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `FleetCategory_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `VehicleFleetCategory` (
  `vehicle_id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`vehicle_id`, `category_id`),
  CONSTRAINT `VehicleFleetCategory_vehicle_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle` (`id`) ON DELETE CASCADE,
  CONSTRAINT `VehicleFleetCategory_category_fkey` FOREIGN KEY (`category_id`) REFERENCES `FleetCategory` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `FleetCategory` (`id`, `name`, `homepage_group`) VALUES ('bus', 'Bus', 'buses');
