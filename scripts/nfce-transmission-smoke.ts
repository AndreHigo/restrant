import { mkdir, writeFile } from "fs/promises";
import path from "path";
import forge from "node-forge";
import { PaymentMethodType, SalesChannel, SalesOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { encryptFiscalSecret } from "@/lib/fiscal-secrets";

process.env.NFCE_TRANSMISSION_MOCK = "authorized";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL ?? "admin@restaurante.local";
const password = process.env.SMOKE_PASSWORD ?? "Admin@123";
const certificatePassword = "qa-transmissao-a1";

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

async function createTemporaryPfx(fileName: string) {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(Date.now());
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  const attrs = [
    { name: "commonName", value: "Restaurant Brasil QA Transmissao" },
    { name: "countryName", value: "BR" },
    { shortName: "ST", value: "TO" },
    { name: "localityName", value: "Palmas" },
    { name: "organizationName", value: "Restaurant Brasil" }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, certificatePassword, {
    algorithm: "3des"
  });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  const targetDir = path.join(process.cwd(), ".runtime", "fiscal-certificates");
  const targetPath = path.join(targetDir, fileName);
  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, Buffer.from(der, "binary"));

  return targetPath;
}

async function postJson<TBody extends object>(pathName: string, cookieHeader: string, body: TBody) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${pathName} retornou HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  return JSON.parse(text) as Record<string, string>;
}

async function main() {
  const suffix = String(Date.now()).slice(-8);
  const created = {
    fiscalDocumentId: "",
    orderId: "",
    paymentId: "",
    productId: ""
  };
  const [category, user, company] = await Promise.all([
    db.productCategory.findFirstOrThrow({ orderBy: { name: "asc" } }),
    db.user.findFirstOrThrow({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } }),
    db.companySetting.findFirstOrThrow({ orderBy: { createdAt: "asc" } })
  ]);
  const previousCompany = {
    fiscalCertificateName: company.fiscalCertificateName,
    fiscalCertificatePasswordCiphertext: company.fiscalCertificatePasswordCiphertext,
    fiscalCertificatePath: company.fiscalCertificatePath,
    fiscalCertificateUploadedAt: company.fiscalCertificateUploadedAt,
    nfceCscId: company.nfceCscId,
    nfceCscTokenCiphertext: company.nfceCscTokenCiphertext,
    nfceNextNumber: company.nfceNextNumber
  };
  const certificatePath = await createTemporaryPfx(`qa-transmissao-${suffix}.pfx`);

  try {
    await db.companySetting.update({
      where: { id: company.id },
      data: {
        fiscalCertificateName: `qa-transmissao-${suffix}.pfx`,
        fiscalCertificatePasswordCiphertext: encryptFiscalSecret(certificatePassword),
        fiscalCertificatePath: certificatePath,
        fiscalCertificateUploadedAt: new Date(),
        nfceCscId: "000001",
        nfceCscTokenCiphertext: encryptFiscalSecret("CSC-QA-HOMOLOGACAO")
      }
    });

    const product = await db.product.create({
      data: {
        active: true,
        categoryId: category.id,
        cost: 7.4,
        fiscalCest: "1707900",
        fiscalCfop: "5102",
        fiscalNcm: "21069090",
        name: `QA Transmissao NFCe ${suffix}`,
        price: 21.5,
        sku: `94${suffix}`,
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
            notes: "QA transmissao NFC-e"
          }
        },
        notes: "QA transmissao NFC-e",
        number: `NFCE-TRANS-${suffix}`,
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
    const prepared = await postJson("/api/admin/fiscal/nfce/prepare", cookieHeader, {
      salesOrderId: order.id
    });
    created.fiscalDocumentId = prepared.id;
    await postJson("/api/admin/fiscal/nfce/sign", cookieHeader, {
      fiscalDocumentId: prepared.id
    });
    const transmitted = await postJson("/api/admin/fiscal/nfce/transmit", cookieHeader, {
      fiscalDocumentId: prepared.id,
      mockAuthorized: true
    });
    const document = await db.fiscalDocument.findUniqueOrThrow({
      where: { id: prepared.id }
    });
    const results = [
      {
        detail: document.status,
        label: "status-autorizado",
        ok: document.status === "AUTHORIZED"
      },
      {
        detail: document.protocolNumber ?? "",
        label: "protocolo",
        ok: Boolean(document.protocolNumber?.startsWith("999"))
      },
      {
        detail: transmitted.transmissionStatus,
        label: "transmissao",
        ok: transmitted.transmissionStatus === "AUTHORIZED"
      }
    ];

    console.table(results);

    const failed = results.filter((item) => !item.ok);

    if (failed.length > 0) {
      throw new Error(`Transmissao NFC-e falhou: ${failed.map((item) => item.label).join(", ")}`);
    }

    console.log("Transmissao NFC-e homologacao aprovada em modo mock.");
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
      data: previousCompany
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  await db.$disconnect();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};
