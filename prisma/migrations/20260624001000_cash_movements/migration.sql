CREATE TYPE "CashMovementType" AS ENUM ('SUPPLY', 'WITHDRAWAL');

CREATE TABLE "CashMovement" (
  "id" TEXT NOT NULL,
  "cashRegisterId" TEXT NOT NULL,
  "type" "CashMovementType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;
