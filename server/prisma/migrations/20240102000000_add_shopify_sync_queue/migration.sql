-- CreateEnum
CREATE TYPE "SyncAction" AS ENUM ('create_listing', 'archive_listing');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'failed', 'done');

-- CreateTable
CREATE TABLE "shopify_sync_queue" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "action" "SyncAction" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_sync_queue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shopify_sync_queue" ADD CONSTRAINT "shopify_sync_queue_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;
