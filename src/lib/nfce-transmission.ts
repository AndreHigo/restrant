type SvrsEnvironment = "homologacao" | "producao";

type TransmissionInput = {
  accessKey: string;
  authorizationUrl: string;
  environment: SvrsEnvironment;
  mockAuthorized?: boolean;
  mockMode?: "authorized" | "received";
  signedXml: string;
};

type ReceiptQueryInput = {
  accessKey: string;
  environment: SvrsEnvironment;
  mockAuthorized?: boolean;
  receiptNumber: string;
  returnAuthorizationUrl: string;
};

function extractTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function cleanXmlDeclaration(xml: string) {
  return xml.replace(/<\?xml[^>]*>\s*/i, "").trim();
}

export function buildNfceAuthorizationEnvelope(input: TransmissionInput) {
  const loteId = input.accessKey.slice(-15).padStart(15, "0");
  const nfeXml = cleanXmlDeclaration(input.signedXml);

  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <idLote>${loteId}</idLote>
        <indSinc>1</indSinc>
        ${nfeXml}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function parseNfceAuthorizationResponse(rawXml: string) {
  const cStat = extractTag(rawXml, "cStat");
  const xMotivo = extractTag(rawXml, "xMotivo");
  const nRec = extractTag(rawXml, "nRec");
  const nProt = extractTag(rawXml, "nProt");
  const authorized = ["100", "150"].includes(cStat);
  const received = ["103", "104"].includes(cStat) || Boolean(nRec);

  return {
    authorized,
    cStat,
    nProt,
    nRec,
    received,
    xMotivo
  };
}

export function buildNfceReceiptQueryEnvelope(input: ReceiptQueryInput) {
  const tpAmb = input.environment === "producao" ? "1" : "2";

  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">
      <consReciNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <tpAmb>${tpAmb}</tpAmb>
        <nRec>${input.receiptNumber}</nRec>
      </consReciNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function parseNfceReceiptQueryResponse(rawXml: string) {
  const cStatValues = [...rawXml.matchAll(/<cStat[^>]*>([\s\S]*?)<\/cStat>/g)].map((match) => match[1]?.trim() ?? "");
  const xMotivoValues = [...rawXml.matchAll(/<xMotivo[^>]*>([\s\S]*?)<\/xMotivo>/g)].map((match) => match[1]?.trim() ?? "");
  const protocolCStat = cStatValues.find((value) => ["100", "150", "110", "301", "302"].includes(value));
  const cStat = protocolCStat || cStatValues[0] || "";
  const protocolIndex = protocolCStat ? cStatValues.indexOf(protocolCStat) : 0;
  const xMotivo = xMotivoValues[protocolIndex] || xMotivoValues[0] || "";
  const nProt = extractTag(rawXml, "nProt");
  const authorized = ["100", "150"].includes(cStat);
  const processing = ["105", "106"].includes(cStat);
  const rejected = Boolean(cStat) && !authorized && !processing;

  return {
    authorized,
    cStat,
    nProt,
    processing,
    rejected,
    xMotivo
  };
}

export async function transmitNfceToSvrs(input: TransmissionInput) {
  const envelope = buildNfceAuthorizationEnvelope(input);

  if (process.env.NFCE_TRANSMISSION_MOCK === "received" || input.mockMode === "received") {
    const mockResponse = `<?xml version="1.0" encoding="UTF-8"?><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${input.environment === "producao" ? "1" : "2"}</tpAmb><verAplic>SVRS-MOCK</verAplic><cStat>103</cStat><xMotivo>Lote recebido com sucesso</xMotivo><infRec><nRec>170000${input.accessKey.slice(-9)}</nRec><tMed>1</tMed></infRec></retEnviNFe>`;

    return {
      envelope,
      httpStatus: 200,
      parsed: parseNfceAuthorizationResponse(mockResponse),
      rawResponse: mockResponse
    };
  }

  if (process.env.NFCE_TRANSMISSION_MOCK === "authorized" || input.mockAuthorized || input.mockMode === "authorized") {
    const mockResponse = `<?xml version="1.0" encoding="UTF-8"?><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${input.environment === "producao" ? "1" : "2"}</tpAmb><verAplic>SVRS-MOCK</verAplic><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><protNFe versao="4.00"><infProt><chNFe>${input.accessKey}</chNFe><nProt>999${input.accessKey.slice(-12)}</nProt></infProt></protNFe></retEnviNFe>`;

    return {
      envelope,
      httpStatus: 200,
      parsed: parseNfceAuthorizationResponse(mockResponse),
      rawResponse: mockResponse
    };
  }

  const response = await fetch(input.authorizationUrl, {
    body: envelope,
    cache: "no-store",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8; action=\"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote\""
    },
    method: "POST"
  });
  const rawResponse = await response.text();

  return {
    envelope,
    httpStatus: response.status,
    parsed: parseNfceAuthorizationResponse(rawResponse),
    rawResponse
  };
}

export async function queryNfceReceiptOnSvrs(input: ReceiptQueryInput) {
  const envelope = buildNfceReceiptQueryEnvelope(input);

  if (process.env.NFCE_RECEIPT_MOCK === "authorized" || input.mockAuthorized) {
    const mockResponse = `<?xml version="1.0" encoding="UTF-8"?><retConsReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${input.environment === "producao" ? "1" : "2"}</tpAmb><verAplic>SVRS-MOCK</verAplic><nRec>${input.receiptNumber}</nRec><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe versao="4.00"><infProt><chNFe>${input.accessKey}</chNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><nProt>999${input.accessKey.slice(-12)}</nProt></infProt></protNFe></retConsReciNFe>`;

    return {
      envelope,
      httpStatus: 200,
      parsed: parseNfceReceiptQueryResponse(mockResponse),
      rawResponse: mockResponse
    };
  }

  const response = await fetch(input.returnAuthorizationUrl, {
    body: envelope,
    cache: "no-store",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8; action=\"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4/nfeRetAutorizacaoLote\""
    },
    method: "POST"
  });
  const rawResponse = await response.text();

  return {
    envelope,
    httpStatus: response.status,
    parsed: parseNfceReceiptQueryResponse(rawResponse),
    rawResponse
  };
}
