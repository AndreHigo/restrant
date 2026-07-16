import { db } from "@/lib/db";
import { decryptFiscalSecret, encryptFiscalSecret, maskSecret } from "@/lib/fiscal-secrets";
import { signNfceXmlWithA1 } from "@/lib/nfce-signature";
import { transmitNfceToSvrs } from "@/lib/nfce-transmission";
import { buildNfceAccessKey, buildNfceXml } from "@/lib/nfce-xml";
import { CompanyFiscalSettingsInput, NfcePrepareInput, NfceSignInput, NfceStatusCheckInput, NfceTransmitInput } from "@/lib/validations/fiscal";

const SVRS_NFCE_ENDPOINTS = {
  homologacao: {
    authorizationUrl: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    returnAuthorizationUrl: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    statusServiceUrl: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx"
  },
  producao: {
    authorizationUrl: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    returnAuthorizationUrl: "https://nfce.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    statusServiceUrl: "https://nfce.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx"
  }
} as const;

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function assertFiscalCompanyReady(company: {
  addressLine: string | null;
  city: string | null;
  document: string | null;
  legalName: string;
  state: string | null;
  stateTaxId: string | null;
  tradeName: string;
  zipCode: string | null;
}) {
  const missing = [
    onlyDigits(company.document).length !== 14 ? "CNPJ da empresa com 14 digitos" : "",
    !company.stateTaxId ? "Inscricao estadual da empresa" : "",
    !company.addressLine ? "Endereco da empresa" : "",
    !company.city ? "Cidade da empresa" : "",
    company.state !== "TO" ? "UF da empresa em TO" : "",
    onlyDigits(company.zipCode).length !== 8 ? "CEP da empresa com 8 digitos" : "",
    company.legalName.length < 3 ? "Razao social da empresa" : "",
    company.tradeName.length < 2 ? "Nome fantasia da empresa" : ""
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Complete os dados fiscais antes de gerar XML NFC-e: ${missing.join(", ")}.`);
  }
}

function assertFiscalItemsReady(
  items: Array<{
    product: {
      fiscalCfop: string | null;
      fiscalNcm: string | null;
      name: string;
    };
  }>
) {
  const invalidItem = items.find(
    (item) => onlyDigits(item.product.fiscalNcm).length !== 8 || onlyDigits(item.product.fiscalCfop).length !== 4
  );

  if (invalidItem) {
    throw new Error(`Produto sem NCM/CFOP validos para XML: ${invalidItem.product.name}.`);
  }
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
    NFCe: "NFC-e",
    NFe: "NF-e"
  };

  return labels[type] ?? type;
}

export async function getFiscalDashboard() {
  const [company, documents, documentsCount, contingencyCount, authorizedCount, pendingOrders] = await Promise.all([
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
    }),
    db.salesOrder.findMany({
      where: {
        status: "PAID",
        fiscalDocuments: {
          none: {}
        }
      },
      include: {
        tab: true,
        table: true,
        payments: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        closedAt: "desc"
      },
      take: 15
    })
  ]);
  const cscConfigured = Boolean(company?.nfceCscId && (company?.nfceCscTokenCiphertext || company?.nfceCscToken));
  const certificateConfigured = Boolean(company?.fiscalCertificateName && company?.fiscalCertificatePath);
  const endpoints =
    company?.fiscalEnvironment === "producao" ? SVRS_NFCE_ENDPOINTS.producao : SVRS_NFCE_ENDPOINTS.homologacao;
  const toHomologationReady = Boolean(
    company &&
      company.fiscalEnvironment === "homologacao" &&
      company.fiscalIntegrationMode === "SVRS_DIRECT" &&
      company.fiscalWebserviceUf === "TO" &&
      company.nfceSeries &&
      company.nfceNextNumber > 0
  );

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
          fiscalEnvironment: company.fiscalEnvironment,
          fiscalIntegrationMode: company.fiscalIntegrationMode,
          fiscalWebserviceUf: company.fiscalWebserviceUf,
          nfceSeries: company.nfceSeries,
          nfceNextNumber: company.nfceNextNumber,
          nfceCscId: company.nfceCscId ?? "",
          nfceCscToken: maskSecret(company.nfceCscTokenCiphertext || company.nfceCscToken),
          fiscalCertificateName: company.fiscalCertificateName ?? "",
          fiscalCertificateUploadedAt: company.fiscalCertificateUploadedAt?.toISOString() ?? ""
        }
      : null,
    readiness: {
      authorizationService: "SVRS",
      authorizationUrl: endpoints.authorizationUrl,
      returnAuthorizationUrl: endpoints.returnAuthorizationUrl,
      statusServiceUrl: endpoints.statusServiceUrl,
      canPrepareHomologationDraft: toHomologationReady,
      canTransmitToSefaz: toHomologationReady && cscConfigured && certificateConfigured,
      cscConfigured,
      certificateConfigured,
      missing: [
        !company ? "Configurar dados fiscais da empresa" : "",
        company?.state !== "TO" ? "UF da empresa deve ser TO para este teste" : "",
        company?.fiscalWebserviceUf !== "TO" ? "UF autorizadora deve ser TO" : "",
        company?.fiscalEnvironment !== "homologacao" ? "Ambiente deve estar em homologacao" : "",
        !company?.nfceSeries ? "Informar serie NFC-e" : "",
        !company?.nfceNextNumber ? "Informar proximo numero NFC-e" : "",
        !cscConfigured ? "Informar ID CSC e CSC de homologacao" : "",
        !certificateConfigured ? "Enviar certificado A1 para transmissao real" : ""
      ].filter(Boolean)
    },
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
      hasXml: Boolean(document.xmlContent),
      hasSignedXml: Boolean(document.signedXmlContent),
      issuedAt: document.issuedAt?.toISOString() ?? "",
      createdAt: document.createdAt.toISOString(),
      signatureStatus: document.signatureStatus,
      transmissionStatus: document.transmissionStatus,
      protocolNumber: document.protocolNumber ?? "",
      rejectionReason: document.rejectionReason ?? "",
      salesOrderNumber: document.salesOrder?.number ?? "",
      salesOrderStatus: document.salesOrder?.status ?? "",
      salesOrderTotal: Number(document.salesOrder?.total ?? 0)
    })),
    pendingOrders: pendingOrders.map((order) => ({
      id: order.id,
      number: order.number,
      customerLabel: order.tab?.number
        ? `Comanda ${order.tab.number}`
        : order.table?.name ?? "Consumidor final",
      total: Number(order.total),
      closedAt: order.closedAt?.toISOString() ?? order.updatedAt.toISOString(),
      itemsCount: order.items.length,
      fiscalReady: order.items.every((item) => Boolean(item.product.fiscalNcm && item.product.fiscalCfop)),
      paymentMethods: order.payments.map((payment) => payment.method).join(", ") || "-"
    }))
  };
}

function getTransmissionStatus(parsed: {
  authorized: boolean;
  cStat: string;
  received: boolean;
}) {
  if (parsed.authorized) {
    return "AUTHORIZED";
  }

  if (parsed.received) {
    return "RECEIVED_BY_SEFAZ";
  }

  if (parsed.cStat) {
    return "REJECTED";
  }

  return "UNKNOWN_RESPONSE";
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
    fiscalEnvironment: data.fiscalEnvironment,
    fiscalIntegrationMode: data.fiscalIntegrationMode,
    fiscalWebserviceUf: data.fiscalWebserviceUf.trim().toUpperCase(),
    nfceSeries: data.nfceSeries.trim(),
    nfceNextNumber: data.nfceNextNumber,
    nfceCscId: cleanOptional(data.nfceCscId),
    ...(data.nfceCscToken && data.nfceCscToken !== "Configurado"
      ? {
          nfceCscToken: null,
          nfceCscTokenCiphertext: encryptFiscalSecret(data.nfceCscToken)
        }
      : {}),
    ...(data.fiscalCertificatePassword
      ? {
          fiscalCertificatePasswordCiphertext: encryptFiscalSecret(data.fiscalCertificatePassword)
        }
      : {}),
    fiscalCertificateName: cleanOptional(data.fiscalCertificateName)
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
        fiscalEnvironment: company.fiscalEnvironment,
        fiscalIntegrationMode: company.fiscalIntegrationMode,
        fiscalWebserviceUf: company.fiscalWebserviceUf,
        nfceSeries: company.nfceSeries,
        nfceNextNumber: company.nfceNextNumber,
        cscConfigured: Boolean(company.nfceCscId && (company.nfceCscTokenCiphertext || company.nfceCscToken)),
        certificateConfigured: Boolean(company.fiscalCertificateName && company.fiscalCertificatePath)
      }
    }
  });

  return company;
}

export async function prepareNfceHomologationDraft(data: NfcePrepareInput, userId: string) {
  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!company) {
    throw new Error("Configure os dados fiscais da empresa antes de preparar NFC-e.");
  }

  if (company.fiscalEnvironment !== "homologacao") {
    throw new Error("Para este teste, coloque o ambiente fiscal como homologacao.");
  }

  if (company.state !== "TO" || company.fiscalWebserviceUf !== "TO") {
    throw new Error("Este teste esta preparado para Tocantins com autorizador SVRS.");
  }

  assertFiscalCompanyReady(company);

  const order = await db.salesOrder.findUnique({
    where: {
      id: data.salesOrderId
    },
    include: {
      fiscalDocuments: true,
      payments: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!order) {
    throw new Error("Venda nao encontrada para emissao NFC-e.");
  }

  if (order.status !== "PAID") {
    throw new Error("Apenas vendas pagas podem preparar NFC-e.");
  }

  if (order.fiscalDocuments.length > 0) {
    throw new Error("Esta venda ja possui documento fiscal vinculado.");
  }

  assertFiscalItemsReady(order.items);

  const number = String(company.nfceNextNumber);
  const randomCode = onlyDigits(order.id).slice(-8) || number;
  const accessKey = buildNfceAccessKey({
    cnpj: company.document ?? "",
    number,
    randomCode,
    series: company.nfceSeries,
    stateCode: "17"
  });
  const endpoints = SVRS_NFCE_ENDPOINTS.homologacao;
  const cscConfigured = Boolean(company.nfceCscId && (company.nfceCscTokenCiphertext || company.nfceCscToken));
  const certificateConfigured = Boolean(company.fiscalCertificateName && company.fiscalCertificatePath);
  const xmlDocument = buildNfceXml({
    accessKey,
    company,
    items: order.items.map((item) => ({
      cfop: item.product.fiscalCfop,
      cest: item.product.fiscalCest,
      name: item.product.name,
      ncm: item.product.fiscalNcm,
      quantity: Number(item.quantity),
      sku: item.product.sku,
      totalPrice: Number(item.totalPrice),
      unit: item.product.unit,
      unitPrice: Number(item.unitPrice)
    })),
    number,
    orderNumber: order.number,
    payments: order.payments.map((payment) => ({
      amount: Number(payment.amount),
      method: payment.method
    })),
    series: company.nfceSeries,
    total: Number(order.total)
  });
  const payload = {
    ambiente: company.fiscalEnvironment,
    autorizador: "SVRS",
    uf: "TO",
    modelo: "65",
    serie: company.nfceSeries,
    numero: number,
    emissor: {
      cnpj: onlyDigits(company.document),
      razaoSocial: company.legalName,
      nomeFantasia: company.tradeName,
      inscricaoEstadual: company.stateTaxId,
      uf: company.state
    },
    venda: {
      id: order.id,
      numero: order.number,
      total: Number(order.total),
      pagamentos: order.payments.map((payment) => ({
        forma: payment.method,
        valor: Number(payment.amount)
      }))
    },
    itens: order.items.map((item, index) => ({
      item: index + 1,
      produto: item.product.name,
      sku: item.product.sku,
      ncm: item.product.fiscalNcm,
      cfop: item.product.fiscalCfop,
      cest: item.product.fiscalCest,
      quantidade: Number(item.quantity),
      valorUnitario: Number(item.unitPrice),
      valorTotal: Number(item.totalPrice)
    })),
    transmissao: {
      statusServicoHomologacao: endpoints.statusServiceUrl,
      autorizacaoHomologacao: endpoints.authorizationUrl,
      prontoParaTransmitir: cscConfigured && certificateConfigured
    },
    xml: {
      digest: xmlDocument.signatureDigest,
      modelo: "65",
      prontoParaAssinatura: true,
      reference: xmlDocument.signatureReference,
      signatureStatus: xmlDocument.signatureStatus
    }
  };

  const document = await db.$transaction(async (tx) => {
    const created = await tx.fiscalDocument.create({
      data: {
        accessKey,
        number,
        payload,
        salesOrderId: order.id,
        series: company.nfceSeries,
        signatureDigest: xmlDocument.signatureDigest,
        signatureStatus: xmlDocument.signatureStatus,
        status: "DRAFT",
        type: "NFCe",
        xmlContent: xmlDocument.xmlContent
      }
    });

    await tx.companySetting.update({
      where: {
        id: company.id
      },
      data: {
        nfceNextNumber: company.nfceNextNumber + 1
      }
    });

    await tx.auditLog.create({
      data: {
        userId,
        module: "fiscal",
        action: "nfce_homologation_draft_prepared",
        entityType: "FiscalDocument",
        entityId: created.id,
        metadata: {
          salesOrderId: order.id,
          salesOrderNumber: order.number,
          number,
          series: company.nfceSeries,
          environment: company.fiscalEnvironment,
          authorizationService: "SVRS",
          readyToTransmit: cscConfigured && certificateConfigured,
          signatureDigest: xmlDocument.signatureDigest,
          signatureStatus: xmlDocument.signatureStatus,
          xmlGenerated: true
        }
      }
    });

    return created;
  });

  return {
    id: document.id,
    number: document.number,
    series: document.series,
    status: document.status,
    accessKey: document.accessKey,
    readyToTransmit: cscConfigured && certificateConfigured,
    signatureDigest: document.signatureDigest,
    signatureStatus: document.signatureStatus,
    xmlGenerated: Boolean(document.xmlContent)
  };
}

export async function signNfceHomologationXml(data: NfceSignInput, userId: string) {
  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!company?.fiscalCertificatePath || !company.fiscalCertificatePasswordCiphertext) {
    throw new Error("Envie o certificado A1 e senha antes de assinar a NFC-e.");
  }

  const document = await db.fiscalDocument.findUnique({
    where: {
      id: data.fiscalDocumentId
    },
    include: {
      salesOrder: {
        select: {
          number: true
        }
      }
    }
  });

  if (!document) {
    throw new Error("Documento fiscal nao encontrado para assinatura.");
  }

  if (document.type !== "NFCe") {
    throw new Error("Apenas NFC-e pode ser assinada por este fluxo.");
  }

  if (!document.xmlContent) {
    throw new Error("Gere o XML da NFC-e antes de assinar.");
  }

  if (document.signedXmlContent) {
    return {
      accessKey: document.accessKey,
      id: document.id,
      number: document.number,
      series: document.series,
      signatureStatus: document.signatureStatus,
      signed: true
    };
  }

  const certificatePassword = decryptFiscalSecret(company.fiscalCertificatePasswordCiphertext);
  const signed = await signNfceXmlWithA1({
    certificatePassword,
    certificatePath: company.fiscalCertificatePath,
    xmlContent: document.xmlContent
  });
  const updated = await db.fiscalDocument.update({
    where: {
      id: document.id
    },
    data: {
      signedXmlContent: signed.signedXml,
      signatureStatus: "SIGNED_PENDING_TRANSMISSION"
    }
  });

  await db.auditLog.create({
    data: {
      userId,
      module: "fiscal",
      action: "nfce_xml_signed",
      entityType: "FiscalDocument",
      entityId: document.id,
      metadata: {
        accessKey: document.accessKey,
        certificateName: company.fiscalCertificateName,
        number: document.number,
        salesOrderNumber: document.salesOrder?.number,
        series: document.series,
        signatureStatus: updated.signatureStatus
      }
    }
  });

  return {
    accessKey: updated.accessKey,
    id: updated.id,
    number: updated.number,
    series: updated.series,
    signatureStatus: updated.signatureStatus,
    signed: true
  };
}

export async function transmitNfceHomologation(data: NfceTransmitInput, userId: string) {
  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!company) {
    throw new Error("Configure os dados fiscais da empresa antes de transmitir NFC-e.");
  }

  if (company.fiscalEnvironment !== "homologacao") {
    throw new Error("Este fluxo esta liberado somente para homologacao por enquanto.");
  }

  const document = await db.fiscalDocument.findUnique({
    where: {
      id: data.fiscalDocumentId
    },
    include: {
      salesOrder: {
        select: {
          number: true
        }
      }
    }
  });

  if (!document) {
    throw new Error("Documento fiscal nao encontrado para transmissao.");
  }

  if (document.type !== "NFCe") {
    throw new Error("Apenas NFC-e pode ser transmitida por este fluxo.");
  }

  if (!document.signedXmlContent) {
    throw new Error("Assine o XML antes de transmitir para a SVRS.");
  }

  if (document.status === "AUTHORIZED") {
    return {
      accessKey: document.accessKey,
      id: document.id,
      protocolNumber: document.protocolNumber,
      status: document.status,
      transmissionStatus: document.transmissionStatus
    };
  }

  const endpoints = SVRS_NFCE_ENDPOINTS.homologacao;

  try {
    const result = await transmitNfceToSvrs({
      accessKey: document.accessKey ?? "",
      authorizationUrl: endpoints.authorizationUrl,
      environment: "homologacao",
      mockAuthorized: process.env.NODE_ENV !== "production" && data.mockAuthorized === true,
      signedXml: document.signedXmlContent
    });
    const transmissionStatus = getTransmissionStatus(result.parsed);
    const fiscalStatus = result.parsed.authorized ? "AUTHORIZED" : transmissionStatus === "REJECTED" ? "REJECTED" : "DRAFT";
    const updated = await db.fiscalDocument.update({
      where: {
        id: document.id
      },
      data: {
        issuedAt: result.parsed.authorized ? new Date() : document.issuedAt,
        protocolNumber: result.parsed.nProt || null,
        rejectionReason: result.parsed.authorized ? null : result.parsed.xMotivo || null,
        status: fiscalStatus,
        transmissionResponse: {
          cStat: result.parsed.cStat,
          httpStatus: result.httpStatus,
          nProt: result.parsed.nProt,
          nRec: result.parsed.nRec,
          rawResponse: result.rawResponse.slice(0, 12000),
          xMotivo: result.parsed.xMotivo
        },
        transmissionStatus
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        module: "fiscal",
        action: "nfce_transmitted_to_svrs",
        entityType: "FiscalDocument",
        entityId: document.id,
        metadata: {
          accessKey: document.accessKey,
          cStat: result.parsed.cStat,
          httpStatus: result.httpStatus,
          nProt: result.parsed.nProt,
          number: document.number,
          salesOrderNumber: document.salesOrder?.number,
          transmissionStatus,
          xMotivo: result.parsed.xMotivo
        }
      }
    });

    return {
      accessKey: updated.accessKey,
      cStat: result.parsed.cStat,
      id: updated.id,
      protocolNumber: updated.protocolNumber,
      rejectionReason: updated.rejectionReason,
      status: updated.status,
      transmissionStatus: updated.transmissionStatus,
      xMotivo: result.parsed.xMotivo
    };
  } catch (error) {
    const errorWithCause = error as Error & {
      cause?: {
        code?: string;
      };
    };
    const updated = await db.fiscalDocument.update({
      where: {
        id: document.id
      },
      data: {
        rejectionReason: error instanceof Error ? error.message : "Falha desconhecida na transmissao",
        transmissionResponse: {
          error: error instanceof Error ? error.message : String(error),
          errorCode: errorWithCause.cause?.code,
          tlsIssue: errorWithCause.cause?.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"
        },
        transmissionStatus: "COMMUNICATION_ERROR"
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        module: "fiscal",
        action: "nfce_transmission_failed",
        entityType: "FiscalDocument",
        entityId: document.id,
        metadata: {
          accessKey: document.accessKey,
          error: error instanceof Error ? error.message : String(error),
          errorCode: errorWithCause.cause?.code,
          tlsIssue: errorWithCause.cause?.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"
        }
      }
    });

    return {
      accessKey: updated.accessKey,
      error: updated.rejectionReason,
      errorCode: errorWithCause.cause?.code,
      id: updated.id,
      status: updated.status,
      transmissionStatus: updated.transmissionStatus
    };
  }
}

export async function updateFiscalCertificate(
  data: {
    fileName: string;
    password?: string;
    path: string;
  },
  userId: string
) {
  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!company) {
    throw new Error("Configure os dados fiscais da empresa antes de enviar o certificado.");
  }

  const updated = await db.companySetting.update({
    where: {
      id: company.id
    },
    data: {
      fiscalCertificateName: data.fileName,
      fiscalCertificatePasswordCiphertext: encryptFiscalSecret(data.password),
      fiscalCertificatePath: data.path,
      fiscalCertificateUploadedAt: new Date()
    }
  });

  await db.auditLog.create({
    data: {
      userId,
      module: "fiscal",
      action: "fiscal_certificate_uploaded",
      entityType: "CompanySetting",
      entityId: company.id,
      metadata: {
        certificateName: data.fileName,
        certificateConfigured: true
      }
    }
  });

  return {
    certificateConfigured: true,
    fiscalCertificateName: updated.fiscalCertificateName,
    fiscalCertificateUploadedAt: updated.fiscalCertificateUploadedAt?.toISOString() ?? ""
  };
}

export async function checkNfceStatusService(data: NfceStatusCheckInput, userId: string) {
  const company = await db.companySetting.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });
  const environment = data.environment ?? company?.fiscalEnvironment ?? "homologacao";
  const endpoints = environment === "producao" ? SVRS_NFCE_ENDPOINTS.producao : SVRS_NFCE_ENDPOINTS.homologacao;
  const startedAt = Date.now();

  try {
    const response = await fetch(`${endpoints.statusServiceUrl}?wsdl`, {
      cache: "no-store"
    });
    const body = await response.text();
    const reachable = response.ok && body.includes("NfeStatusServico");
    const protectedBySefaz = response.status === 403;

    await db.auditLog.create({
      data: {
        userId,
        module: "fiscal",
        action: "nfce_status_service_checked",
        entityType: "CompanySetting",
        entityId: company?.id,
        metadata: {
          environment,
          httpStatus: response.status,
          protectedBySefaz,
          reachable: reachable || protectedBySefaz,
          statusServiceUrl: endpoints.statusServiceUrl
        }
      }
    });

    return {
      checkedAt: new Date().toISOString(),
      environment,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      protectedBySefaz,
      reachable: reachable || protectedBySefaz,
      statusServiceUrl: endpoints.statusServiceUrl
    };
  } catch (error) {
    const errorWithCause = error as Error & {
      cause?: {
        code?: string;
      };
    };
    const tlsIssue = errorWithCause.cause?.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY";

    await db.auditLog.create({
      data: {
        userId,
        module: "fiscal",
        action: "nfce_status_service_check_failed",
        entityType: "CompanySetting",
        entityId: company?.id,
        metadata: {
          environment,
          errorCode: errorWithCause.cause?.code,
          error: error instanceof Error ? error.message : String(error),
          tlsIssue,
          statusServiceUrl: endpoints.statusServiceUrl
        }
      }
    });

    return {
      checkedAt: new Date().toISOString(),
      environment,
      error: error instanceof Error ? error.message : "Falha desconhecida",
      errorCode: errorWithCause.cause?.code,
      httpStatus: 0,
      latencyMs: Date.now() - startedAt,
      reachable: false,
      tlsIssue,
      statusServiceUrl: endpoints.statusServiceUrl
    };
  }
}
