-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "public_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL DEFAULT 0,
    "chauffeur_price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "hire_modes" TEXT NOT NULL DEFAULT 'chauffeured_only',
    "passengers" TEXT NOT NULL DEFAULT '',
    "transmission" TEXT NOT NULL DEFAULT 'Automatic',
    "fuel" TEXT NOT NULL DEFAULT 'Petrol',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicle_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'image/jpeg',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VehicleMedia_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Booking_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_public_id_key" ON "Vehicle"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_slug_key" ON "Vehicle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_public_id_key" ON "Booking"("public_id");
