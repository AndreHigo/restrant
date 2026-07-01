-- CreateEnum
CREATE TYPE "ProductionItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_productId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "preparationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "productionSectorId" TEXT,
ADD COLUMN     "sendToProduction" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ProductionSector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionItem" (
    "id" TEXT NOT NULL,
    "salesOrderItemId" TEXT NOT NULL,
    "productionSectorId" TEXT NOT NULL,
    "status" "ProductionItemStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" DECIMAL(12,3) NOT NULL,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSector_slug_key" ON "ProductionSector"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSector_name_key" ON "ProductionSector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionItem_salesOrderItemId_key" ON "ProductionItem"("salesOrderItemId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productionSectorId_fkey" FOREIGN KEY ("productionSectorId") REFERENCES "ProductionSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionItem" ADD CONSTRAINT "ProductionItem_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionItem" ADD CONSTRAINT "ProductionItem_productionSectorId_fkey" FOREIGN KEY ("productionSectorId") REFERENCES "ProductionSector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
