-- Both showcases are opt-in. Select suitable active, public vehicles in Admin after upgrading.
ALTER TABLE `Vehicle`
  ADD COLUMN `feature_on_homepage` BOOLEAN NOT NULL DEFAULT false
    AFTER `vendor_bookings_enabled`,
  ADD COLUMN `show_on_special_occasions` BOOLEAN NOT NULL DEFAULT false
    AFTER `feature_on_homepage`;
