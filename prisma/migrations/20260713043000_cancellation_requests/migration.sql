CREATE TYPE "CancellationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CancellationRequestTarget" AS ENUM ('SALES_ORDER', 'SALES_ORDER_ITEM');

CREATE TABLE "CancellationRequest" (
    "id" TEXT NOT NULL,
    "target" "CancellationRequestTarget" NOT NULL,
    "salesOrderId" TEXT,
    "salesOrderItemId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompanySetting" ADD COLUMN "requireCancelApproval" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "CancellationRequest_status_createdAt_idx" ON "CancellationRequest"("status", "createdAt");
CREATE INDEX "CancellationRequest_salesOrderId_idx" ON "CancellationRequest"("salesOrderId");
CREATE INDEX "CancellationRequest_salesOrderItemId_idx" ON "CancellationRequest"("salesOrderItemId");
