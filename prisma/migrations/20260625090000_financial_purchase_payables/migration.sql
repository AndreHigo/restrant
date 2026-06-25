ALTER TABLE "AccountPayable" ADD COLUMN "purchaseOrderId" TEXT;

CREATE UNIQUE INDEX "AccountPayable_purchaseOrderId_key" ON "AccountPayable"("purchaseOrderId");

ALTER TABLE "AccountPayable" ADD CONSTRAINT "AccountPayable_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountPayable" ADD CONSTRAINT "AccountPayable_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
