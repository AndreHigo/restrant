type SvrsEnvironment = "homologacao" | "producao";

type CancellationEventInput = {
  accessKey: string;
  cnpj: string;
  environment: SvrsEnvironment;
  justification: string;
  protocolNumber: string;
  sequence?: number;
};

type CancellationSubmitInput = CancellationEventInput & {
  eventUrl: string;
  mockAuthorized?: boolean;
  signedEventXml: string;
};

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function extractTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function cleanXmlDeclaration(xml: string) {
  return xml.replace(/<\?xml[^>]*>\s*/i, "").trim();
}

export function buildNfceCancellationEventXml(input: CancellationEventInput) {
  const tpAmb = input.environment === "producao" ? "1" : "2";
  const sequence = input.sequence ?? 1;
  const normalizedSequence = String(sequence).padStart(2, "0");
  const eventId = `ID110111${input.accessKey}${normalizedSequence}`;
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <infEvento Id="${eventId}">
    <cOrgao>91</cOrgao>
    <tpAmb>${tpAmb}</tpAmb>
    <CNPJ>${onlyDigits(input.cnpj)}</CNPJ>
    <chNFe>${input.accessKey}</chNFe>
    <dhEvento>${now}</dhEvento>
    <tpEvento>110111</tpEvento>
    <nSeqEvento>${sequence}</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Cancelamento</descEvento>
      <nProt>${input.protocolNumber}</nProt>
      <xJust>${input.justification.trim()}</xJust>
    </detEvento>
  </infEvento>
</evento>`;
}

export function buildNfceCancellationEnvelope(input: Pick<CancellationSubmitInput, "accessKey" | "signedEventXml">) {
  const loteId = input.accessKey.slice(-15).padStart(15, "0");
  const eventXml = cleanXmlDeclaration(input.signedEventXml);

  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      <envEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <idLote>${loteId}</idLote>
        ${eventXml}
      </envEvento>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function parseNfceCancellationResponse(rawXml: string) {
  const cStatValues = [...rawXml.matchAll(/<cStat[^>]*>([\s\S]*?)<\/cStat>/g)].map((match) => match[1]?.trim() ?? "");
  const xMotivoValues = [...rawXml.matchAll(/<xMotivo[^>]*>([\s\S]*?)<\/xMotivo>/g)].map((match) => match[1]?.trim() ?? "");
  const eventCStat = cStatValues.find((value) => ["135", "136", "155"].includes(value));
  const cStat = eventCStat || cStatValues[0] || "";
  const eventIndex = eventCStat ? cStatValues.indexOf(eventCStat) : 0;
  const xMotivo = xMotivoValues[eventIndex] || xMotivoValues[0] || "";
  const protocolNumber = extractTag(rawXml, "nProt");
  const canceled = ["135", "136", "155"].includes(cStat);

  return {
    canceled,
    cStat,
    protocolNumber,
    xMotivo
  };
}

export async function cancelNfceOnSvrs(input: CancellationSubmitInput) {
  const envelope = buildNfceCancellationEnvelope(input);

  if (process.env.NFCE_CANCEL_MOCK === "authorized" || input.mockAuthorized) {
    const mockResponse = `<?xml version="1.0" encoding="UTF-8"?><retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${input.accessKey.slice(-15)}</idLote><tpAmb>${input.environment === "producao" ? "1" : "2"}</tpAmb><cOrgao>91</cOrgao><cStat>128</cStat><xMotivo>Lote de Evento Processado</xMotivo><retEvento versao="1.00"><infEvento><tpAmb>${input.environment === "producao" ? "1" : "2"}</tpAmb><verAplic>SVRS-MOCK</verAplic><cOrgao>91</cOrgao><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><chNFe>${input.accessKey}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><nProt>999${input.accessKey.slice(-12)}</nProt></infEvento></retEvento></retEnvEvento>`;

    return {
      envelope,
      httpStatus: 200,
      parsed: parseNfceCancellationResponse(mockResponse),
      rawResponse: mockResponse
    };
  }

  const response = await fetch(input.eventUrl, {
    body: envelope,
    cache: "no-store",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8; action=\"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento\""
    },
    method: "POST"
  });
  const rawResponse = await response.text();

  return {
    envelope,
    httpStatus: response.status,
    parsed: parseNfceCancellationResponse(rawResponse),
    rawResponse
  };
}
