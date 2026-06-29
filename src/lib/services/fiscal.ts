import { db } from "@/lib/db";
import { CompanyFiscalSettingsInput } from "@/lib/validations/fiscal";

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatFiscalStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    AUTHORIZED: "Autorizado",
    CANCELED: "Cancelado",
    REJECTED: "Rejeitado",
    CONTINGENCY: "Contingencia"
  };

  return labels[status] ?? status;
}

function formatFiscalType(type: string) {
  const labels: Record<string, string> = {
    NFCE: "NFC-e",
    NFE: "NF-e"
  };

  return labels[type] ?? type;
}

export async function getFiscalDashboard() {
  const [company, documents, documentsCount, contingencyCount, authorizedCount] = await Promise.all([
    db.companySetting.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.fiscalDocument.findMany({
      include: {
        salesOrder: {
          select: {
            number: true,
            total: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12
    }),
    db.fiscalDocument.count(),
    db.fiscalDocument.count({
      where: {
        contingency: true
      }
    }),
    db.fiscalDocument.count({
      where: {
        status: "AUTHORIZED"
      }
    })
  ]);

  return {
    company: company
      ? {
          id: company.id,
          legalName: company.legalName,
          tradeName: company.tradeName,
          document: company.document ?? "",
          stateTaxId: company.stateTaxId ?? "",
          cityTaxId: company.cityTaxId ?? "",
          email: company.email ?? "",
          phone: company.phone ?? "",
          addressLine: company.addressLine ?? "",
          city: company.city ?? "",
          state: company.state ?? "",
          zipCode: company.zipCode ?? "",
          fiscalEnvironment: company.fiscalEnvironment
        }
      : null,
    kpis: {
      documentsCount,
      authorizedCount,
      contingencyCount,
      rejectedCount: documents.filter((document) => document.status === "REJECTED").length
    },
    documents: documents.map((document) => ({
      id: document.id,
      type: document.type,
      typeLabel: formatFiscalType(document.type),
      status: document.status,
      statusLabel: formatFiscalStatus(document.status),
      number: document.number ?? "",
      series: document.series ?? "",
      accessKey: document.accessKey ?? "",
      contingency: document.contingency,
      issuedAt: document.issuedAt?.toISOString() ?? "",
      createdAt: document.createdAt.toISOString(),
      salesOrderNumber: document.salesOrder?.number ?? "",
      salesOrderStatus: document.salesOrder?.status ?? "",
      salesOrderTotal: Number(document.salesOrder?.total ?? 0)
    }))
  };
}

export async function updateCompanyFiscalSettings(data: CompanyFiscalSettingsInput, userId: string) {
  const existing = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  const payload = {
    legalName: data.legalName.trim(),
    tradeName: data.tradeName.trim(),
    document: cleanOptional(data.document),
    stateTaxId: cleanOptional(data.stateTaxId),
    cityTaxId: cleanOptional(data.cityTaxId),
    email: cleanOptional(data.email),
    phone: cleanOptional(data.phone),
    addressLine: cleanOptional(data.addressLine),
    city: cleanOptional(data.city),
    state: data.state.trim().toUpperCase(),
    zipCode: cleanOptional(data.zipCode),
    fiscalEnvironment: data.fiscalEnvironment
  };

  const company = existing
    ? await db.companySetting.update({
        where: {
          id: existing.id
        },
        data: payload
      })
    : await db.companySetting.create({
        data: payload
      });

  await db.auditLog.create({
    data: {
      userId,
      module: "fiscal",
      action: "company_settings_update",
      entityType: "CompanySetting",
      entityId: company.id,
      metadata: {
        legalName: company.legalName,
        tradeName: company.tradeName,
        fiscalEnvironment: company.fiscalEnvironment
      }
    }
  });

  return company;
}
