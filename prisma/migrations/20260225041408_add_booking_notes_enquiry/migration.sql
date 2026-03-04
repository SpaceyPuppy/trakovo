-- CreateTable
CREATE TABLE "BookingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Staff',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingNote_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "public_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "hire_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "total_days" INTEGER NOT NULL,
    "daily_rate" INTEGER NOT NULL,
    "total_cost" INTEGER NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "driver_name" TEXT,
    "driver_dob" TEXT,
    "driver_licence_number" TEXT,
    "driver_licence_expiry" TEXT,
    "agreement_accepted" BOOLEAN NOT NULL DEFAULT false,
    "id_document_path" TEXT,
    "licence_document_path" TEXT,
    "is_enquiry" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Booking_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("agreement_accepted", "contact_email", "contact_name", "contact_phone", "created_at", "daily_rate", "driver_dob", "driver_licence_expiry", "driver_licence_number", "driver_name", "end_date", "hire_type", "id", "id_document_path", "licence_document_path", "public_id", "start_date", "status", "total_cost", "total_days", "updated_at", "vehicle_id") SELECT "agreement_accepted", "contact_email", "contact_name", "contact_phone", "created_at", "daily_rate", "driver_dob", "driver_licence_expiry", "driver_licence_number", "driver_name", "end_date", "hire_type", "id", "id_document_path", "licence_document_path", "public_id", "start_date", "status", "total_cost", "total_days", "updated_at", "vehicle_id" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_public_id_key" ON "Booking"("public_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
