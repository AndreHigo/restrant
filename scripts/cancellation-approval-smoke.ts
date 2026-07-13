import { db } from "../src/lib/db";
import { cancelSalesOrderItem, reviewCancellationRequest } from "../src/lib/services/operations";

async function main() {
  const company = await db.companySetting.findFirst({ orderBy: { createdAt: "asc" } });
  const previousApproval = company?.requireCancelApproval ?? false;
  const admin = await db.user.findFirst({ where: { role: { name: "administrador" } } });
  const attendant = await db.user.findFirst({ where: { role: { name: "atendente" } } });
  const product = await db.product.findFirst({ where: { active: true, type: { not: "INGREDIENT" } } });

  if (!company || !admin || !attendant || !product) {
    throw new Error("Dados base ausentes para teste de aprovacao de cancelamento.");
  }

  const suffix = Date.now().toString();
  const unitPrice = Number(product.price);
  const tab = await db.tab.create({
    data: {
      number: `880${suffix.slice(-6)}`,
      customerName: "QA cancelamento aprovado"
    }
  });
  const order = await db.salesOrder.create({
    data: {
      number: `QA${suffix}`,
      channel: "TAB",
      tabId: tab.id,
      openedBy: attendant.id,
      subtotal: unitPrice * 2,
      total: unitPrice * 2,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice,
            discount: 0,
            totalPrice: unitPrice,
            notes: "QA item para aprovar cancelamento"
          },
          {
            productId: product.id,
            quantity: 1,
            unitPrice,
            discount: 0,
            totalPrice: unitPrice,
            notes: "QA item restante"
          }
        ]
      }
    },
    include: {
      items: true
    }
  });

  try {
    await db.companySetting.update({
      where: { id: company.id },
      data: { requireCancelApproval: true }
    });

    const targetItem = order.items[0];
    const requestResult = (await cancelSalesOrderItem(
      { salesOrderItemId: targetItem.id, cancelReason: "Erro de lancamento" },
      attendant.id,
      false
    )) as { approvalRequired?: boolean; request?: { id: string } };

    if (!requestResult.approvalRequired || !requestResult.request?.id) {
      throw new Error("Cancelamento nao gerou solicitacao de aprovacao.");
    }

    const itemBeforeApproval = await db.salesOrderItem.findUnique({
      where: { id: targetItem.id }
    });

    if (!itemBeforeApproval) {
      throw new Error("Item foi cancelado antes da aprovacao.");
    }

    await reviewCancellationRequest(
      {
        requestId: requestResult.request.id,
        approved: true,
        reviewNote: "Aprovado no teste focado"
      },
      admin.id
    );

    const itemAfterApproval = await db.salesOrderItem.findUnique({
      where: { id: targetItem.id }
    });
    const reviewed = await db.cancellationRequest.findUnique({
      where: { id: requestResult.request.id }
    });

    if (itemAfterApproval || reviewed?.status !== "APPROVED") {
      throw new Error("Aprovacao nao cancelou item ou nao marcou solicitacao como aprovada.");
    }

    console.log(`Fluxo de aprovacao de cancelamento aprovado: ${requestResult.request.id}`);
  } finally {
    await db.companySetting.update({
      where: { id: company.id },
      data: { requireCancelApproval: previousApproval }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
