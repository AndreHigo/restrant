-- CreateIndex
CREATE INDEX "Tab_active_openedAt_idx" ON "Tab"("active", "openedAt");

-- CreateIndex
CREATE INDEX "SalesOrder_status_updatedAt_idx" ON "SalesOrder"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SalesOrder_tabId_status_idx" ON "SalesOrder"("tabId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tableId_status_idx" ON "SalesOrder"("tableId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_openedAt_idx" ON "SalesOrder"("openedAt");

-- CreateIndex
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_productId_salesOrderId_idx" ON "SalesOrderItem"("productId", "salesOrderId");

-- CreateIndex
CREATE INDEX "Payment_salesOrderId_status_idx" ON "Payment"("salesOrderId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
