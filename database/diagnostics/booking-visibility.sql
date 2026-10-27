-- READ ONLY: counts and schema metadata, no customer contact information.
-- Run statements separately and retain the exact error if any statement fails.
-- The production database name was supplied by the owner.

SELECT COUNT(*) AS booking_count FROM `ckbservi_trakovo`.`Booking`;

SELECT b.status, COALESCE(b.is_enquiry, 0) AS is_enquiry, COUNT(*) AS booking_count
FROM `ckbservi_trakovo`.`Booking` b
GROUP BY b.status, COALESCE(b.is_enquiry, 0);

SELECT COUNT(*) AS joined_booking_count
FROM `ckbservi_trakovo`.`Booking` b
LEFT JOIN `ckbservi_trakovo`.`Vehicle` v ON b.vehicle_id = v.id
LEFT JOIN `ckbservi_trakovo`.`Vendor` vnd ON b.vendor_id = vnd.id
LEFT JOIN `ckbservi_trakovo`.`VendorClient` vc ON b.vendor_client_id = vc.id;

-- If the joins fail, this metadata helps distinguish schema/collation differences.
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ckbservi_trakovo'
  AND TABLE_NAME IN ('Booking', 'Vehicle', 'Vendor', 'VendorClient', 'VehicleBlockout');

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'ckbservi_trakovo'
  AND (
    (TABLE_NAME = 'Booking' AND COLUMN_NAME IN ('id', 'vendor_id', 'vehicle_id', 'vendor_client_id', 'created_at', 'start_date', 'end_date'))
    OR (TABLE_NAME IN ('Vehicle', 'Vendor', 'VendorClient') AND COLUMN_NAME IN ('id', 'name'))
  );

-- Check for legacy zero timestamps without asking mysql2 to create Date objects.
SELECT COUNT(*) AS zero_created_at_count
FROM `ckbservi_trakovo`.`Booking`
WHERE CAST(created_at AS CHAR) LIKE '0000-%';
