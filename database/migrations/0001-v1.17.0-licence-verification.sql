ALTER TABLE `Booking`
  ADD COLUMN `licence_verification_deferred` BOOLEAN NOT NULL DEFAULT false
  AFTER `driver_licence_expiry`;
