import { PaymentMethodType, SalesChannel, SalesOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";

function getSetCookie(headers: Headers) {
  const anyHeaders = headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (anyHeaders.getSetCookie) {
    return anyHeaders.getSetCookie();
  }

  const rawCookies = anyHeaders.raw?.()["set-cookie"];

  if (rawCookies) {
    return rawCookies;
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function createCookieHeader(setCookies: string[]) {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual"
  });

  if (!response.ok) {
    throw new Error(`Login retornou HTTP ${response.status}.`);
  }

  const cookieHeader = createCookieHeader(getSetCookie(response.headers));

  if (!cookieHeader) {
    throw new Error("Login nao retornou cookie de sessao.");
  }

  return cookieHeader;
}

async function main() {
  const suffix = String(Date.now()).slice(-8);
  const created = {
    fiscalDocumentId: "",
    orderId: "",
    paymentId: "",
    productId: ""
  };

  const [category, user] = await Promise.all([
    db.productCategory.findFirstOrThrow({ orderBy: { name: "asc" } }),
    db.user.findFirstOrThrow({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } })
  ]);

  const company = await db.companySetting.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const previousNextNumber = company.nfceNextNumber;

  try {
    const product = await db.product.create({
      data: {
        active: true,
        categoryId: category.id,
        cost: 7.4,
        fiscalCest: "1707900",
        fiscalCfop: "5102",
        fiscalNcm: "21069090",
        name: `QA NFCe Homologacao ${suffix}`,
        price: 21.5,
        sku: `98${suffix}`,
        trackStock: false,
        type: "READY",
        unit: "UN"
      }
    });
    created.productId = product.id;

    const total = Number(product.price);
    const order = await db.salesOrder.create({
      data: {
        channel: SalesChannel.COUNTER,
        closedAt: new Date(),
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            totalPrice: total,
            unitPrice: total,
            notes: "QA preparacao NFC-e homologacao"
          }
        },
        notes: "QA preparacao NFC-e homologacao",
        number: `NFCE-PREP-${suffix}`,
        openedBy: user.id,
        status: SalesOrderStatus.PAID,
        subtotal: total,
        total
      }
    });
    created.orderId = order.id;

    const payment = await db.payment.create({
      data: {
        amount: total,
        method: PaymentMethodType.PIX,
        paidAt: new Date(),
        salesOrderId: order.id,
        status: "PAID"
      }
    });
    created.paymentId = payment.id;

    const cookieHeader = await login();
    const response = await fetch(`${baseUrl}/api/admin/fiscal/nfce/prepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader
      },
      body: JSON.stringify({
        salesOrderId: order.id
      })
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Preparacao NFC-e retornou HTTP ${response.status}: ${body.slice(0, 500)}`);
    }

    const payload = JSON.parse(body) as {
      accessKey: string;
      id: string;
      number: string;
      series: string;
      status: string;
    };
    created.fiscalDocumentId = payload.id;

    const persisted = await db.fiscalDocument.findUnique({
      where: { id: payload.id },
      include: { salesOrder: true }
    });
    const updatedCompany = await db.companySetting.findUniqueOrThrow({
      where: { id: company.id }
    });

    const results = [
      {
        detail: `${payload.series}/${payload.number}`,
        label: "documento-criado",
        ok: Boolean(persisted && persisted.salesOrderId === order.id && persisted.type === "NFCe")
      },
      {
        detail: payload.status,
        label: "status-rascunho",
        ok: payload.status === "DRAFT"
      },
      {
        detail: `antes ${previousNextNumber}, depois ${updatedCompany.nfceNextNumber}`,
        label: "numeracao-avancou",
        ok: updatedCompany.nfceNextNumber === previousNextNumber + 1
      }
    ];

    console.table(results);

    const failed = results.filter((item) => !item.ok);

    if (failed.length > 0) {
      throw new Error(`Preparacao NFC-e falhou: ${failed.map((item) => item.label).join(", ")}`);
    }

    console.log("Preparacao de NFC-e de homologacao pela API aprovada.");
  } finally {
    if (created.fiscalDocumentId) {
      await db.fiscalDocument.deleteMany({ where: { id: created.fiscalDocumentId } });
    }
    if (created.paymentId) {
      await db.payment.deleteMany({ where: { id: created.paymentId } });
    }
    if (created.orderId) {
      await db.salesOrder.deleteMany({ where: { id: created.orderId } });
    }
    if (created.productId) {
      await db.product.deleteMany({ where: { id: created.productId } });
    }
    await db.companySetting.update({
      where: { id: company.id },
      data: { nfceNextNumber: previousNextNumber }
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  await db.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
