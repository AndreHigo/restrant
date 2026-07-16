import { FiscalDocumentStatus, FiscalDocumentType, PaymentMethodType, SalesChannel, SalesOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getFiscalDashboard } from "@/lib/services/fiscal";

type FiscalSmokeResult = {
  step: string;
  ok: boolean;
  detail: string;
};

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function money(value: number) {
  return Number(value.toFixed(2));
}

async function main() {
  const suffix = String(Date.now()).slice(-8);
  const results: FiscalSmokeResult[] = [];
  const createdIds = {
    fiscalDocumentId: "",
    paymentId: "",
    orderId: "",
    productId: ""
  };

  const [company, user, category] = await Promise.all([
    db.companySetting.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.user.findFirstOrThrow({
      where: {
        status: "ACTIVE"
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.productCategory.findFirstOrThrow({
      orderBy: {
        name: "asc"
      }
    })
  ]);

  if (!company) {
    throw new Error("Configuracao fiscal da empresa nao encontrada.");
  }

  try {
    const companyDocument = onlyDigits(company.document);
    const companyState = (company.state ?? "").trim().toUpperCase();
    const companyReady =
      company.legalName.length >= 3 &&
      company.tradeName.length >= 2 &&
      companyDocument.length === 14 &&
      companyState.length === 2 &&
      ["homologacao", "producao"].includes(company.fiscalEnvironment);

    results.push({
      step: "empresa-fiscal",
      ok: companyReady,
      detail: `${company.tradeName} / ${company.fiscalEnvironment}`
    });

    if (!companyReady) {
      throw new Error("Dados fiscais da empresa ainda nao estao prontos para teste de NFC-e.");
    }

    const product = await db.product.create({
      data: {
        active: true,
        categoryId: category.id,
        cost: 8.5,
        fiscalCest: "1707900",
        fiscalCfop: "5102",
        fiscalNcm: "21069090",
        name: `QA Produto NFCe ${suffix}`,
        price: 19.9,
        sku: `97${suffix}`,
        trackStock: false,
        type: "READY",
        unit: "UN"
      }
    });
    createdIds.productId = product.id;

    const productReady =
      onlyDigits(product.fiscalNcm).length === 8 &&
      onlyDigits(product.fiscalCfop).length === 4 &&
      onlyDigits(product.fiscalCest).length === 7;

    results.push({
      step: "produto-fiscal",
      ok: productReady,
      detail: `NCM ${product.fiscalNcm} / CFOP ${product.fiscalCfop} / CEST ${product.fiscalCest}`
    });

    if (!productReady) {
      throw new Error("Produto fiscal de QA nao ficou completo.");
    }

    const total = money(Number(product.price) * 2);
    const order = await db.salesOrder.create({
      data: {
        channel: SalesChannel.COUNTER,
        closedAt: new Date(),
        items: {
          create: {
            productId: product.id,
            quantity: 2,
            totalPrice: total,
            unitPrice: Number(product.price),
            notes: "QA prontidao NFC-e"
          }
        },
        notes: "QA prontidao fiscal NFC-e",
        number: `NFCE-QA-${suffix}`,
        openedBy: user.id,
        status: SalesOrderStatus.PAID,
        subtotal: total,
        total
      }
    });
    createdIds.orderId = order.id;

    const payment = await db.payment.create({
      data: {
        amount: total,
        method: PaymentMethodType.PIX,
        paidAt: new Date(),
        salesOrderId: order.id,
        status: "PAID"
      }
    });
    createdIds.paymentId = payment.id;

    results.push({
      step: "venda-vinculada",
      ok: Boolean(order.id && payment.id),
      detail: `Venda ${order.number} paga por PIX`
    });

    const fiscalDocument = await db.fiscalDocument.create({
      data: {
        accessKey: `35${suffix.padStart(42, "0")}`.slice(0, 44),
        issuedAt: new Date(),
        number: suffix,
        payload: {
          ambiente: company.fiscalEnvironment,
          empresa: {
            cnpj: companyDocument,
            razaoSocial: company.legalName,
            uf: companyState
          },
          itens: [
            {
              cfop: product.fiscalCfop,
              cest: product.fiscalCest,
              ncm: product.fiscalNcm,
              produto: product.name,
              quantidade: 2,
              total
            }
          ],
          observacao: "Documento de QA estrutural. Nao enviado para SEFAZ."
        },
        salesOrderId: order.id,
        series: "1",
        status: FiscalDocumentStatus.DRAFT,
        type: FiscalDocumentType.NFCe
      }
    });
    createdIds.fiscalDocumentId = fiscalDocument.id;

    results.push({
      step: "documento-nfce",
      ok:
        fiscalDocument.type === FiscalDocumentType.NFCe &&
        fiscalDocument.status === FiscalDocumentStatus.DRAFT &&
        fiscalDocument.salesOrderId === order.id,
      detail: `NFC-e ${fiscalDocument.number} em rascunho vinculada a venda ${order.number}`
    });

    const dashboard = await getFiscalDashboard();
    const dashboardDocument = dashboard.documents.find((item) => item.id === fiscalDocument.id);

    results.push({
      step: "dashboard-fiscal",
      ok:
        Boolean(dashboardDocument) &&
        dashboardDocument?.typeLabel === "NFC-e" &&
        dashboardDocument?.salesOrderNumber === order.number,
      detail: dashboardDocument
        ? `${dashboardDocument.typeLabel} exibida no historico fiscal`
        : "Documento nao apareceu no painel fiscal"
    });

    console.table(results);

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      throw new Error(`Prontidao fiscal falhou: ${failed.map((item) => item.step).join(", ")}`);
    }

    console.log("Prontidao estrutural de NFC-e aprovada. Emissao real ainda depende de certificado/provedor fiscal.");
  } finally {
    if (createdIds.fiscalDocumentId) {
      await db.fiscalDocument.deleteMany({ where: { id: createdIds.fiscalDocumentId } });
    }
    if (createdIds.paymentId) {
      await db.payment.deleteMany({ where: { id: createdIds.paymentId } });
    }
    if (createdIds.orderId) {
      await db.salesOrder.deleteMany({ where: { id: createdIds.orderId } });
    }
    if (createdIds.productId) {
      await db.auditLog.deleteMany({ where: { entityId: createdIds.productId } });
      await db.product.deleteMany({ where: { id: createdIds.productId } });
    }
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  await db.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
