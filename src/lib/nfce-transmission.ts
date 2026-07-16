type SvrsEnvironment = "homologacao" | "producao";

type TransmissionInput = {
  accessKey: string;
  authorizationUrl: string;
  environment: SvrsEnvironment;
  mockAuthorized?: boolean;
  signedXml: string;
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

export async function transmitNfceToSvrs(input: TransmissionInput) {
  const envelope = buildNfceAuthorizationEnvelope(input);

  if (process.env.NFCE_TRANSMISSION_MOCK === "authorized" || input.mockAuthorized) {
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
