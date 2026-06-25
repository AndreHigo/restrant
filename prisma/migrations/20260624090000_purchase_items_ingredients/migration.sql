ALTER TABLE "PurchaseOrderItem" ADD COLUMN "ingredientId" TEXT;
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
