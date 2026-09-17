-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('available', 'sold');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('sale', 'receipt');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('admin', 'cashier');

-- CreateTable
CREATE TABLE "units" (
    "unit_id" SERIAL NOT NULL,
    "qr_code" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "grade" "Grade" NOT NULL,
    "condition_notes" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'available',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT,
    "staff_id" INTEGER NOT NULL,
    "shopify_product_id" TEXT,
    "shopify_variant_id" TEXT,

    CONSTRAINT "units_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "txn_id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "price_at_sale" DECIMAL(10,2) NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("txn_id")
);

-- CreateTable
CREATE TABLE "staff" (
    "staff_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "pin" TEXT NOT NULL,
    "requires_pin_reset" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_qr_code_key" ON "units"("qr_code");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

