import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const expectedIndexes = [
  "Tab_active_openedAt_idx",
  "SalesOrder_status_updatedAt_idx",
  "SalesOrder_tabId_status_idx",
  "SalesOrder_tableId_status_idx",
  "SalesOrder_openedAt_idx",
  "SalesOrderItem_salesOrderId_idx",
  "SalesOrderItem_productId_salesOrderId_idx",
  "Payment_salesOrderId_status_idx",
  "Payment_status_paidAt_idx",
  "Payment_createdAt_idx"
];

async function main() {
  const rows = await db.$queryRaw<Array<{ indexname: string }>>(
    Prisma.sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
  );
  const available = new Set(rows.map((row) => row.indexname));
  const missing = expectedIndexes.filter((indexName) => !available.has(indexName));

  if (missing.length > 0) {
    throw new Error(`Indices operacionais ausentes: ${missing.join(", ")}`);
  }

  const explain = await db.$queryRaw<Array<{ "QUERY PLAN": unknown }>>(
    Prisma.sql`EXPLAIN (FORMAT JSON) SELECT "id" FROM "SalesOrder" WHERE "status" = 'OPEN' ORDER BY "updatedAt" DESC LIMIT 40`
  );

  if (!explain.length) {
    throw new Error("O PostgreSQL nao retornou plano para a consulta operacional.");
  }

  console.log(`Indices operacionais aprovados: ${expectedIndexes.length}. Plano de consulta retornado.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
