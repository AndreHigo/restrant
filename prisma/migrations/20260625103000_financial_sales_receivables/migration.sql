ALTER TABLE "AccountReceivable" ADD COLUMN "salesOrderId" TEXT;

CREATE UNIQUE INDEX "AccountReceivable_salesOrderId_key" ON "AccountReceivable"("salesOrderId");

ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
