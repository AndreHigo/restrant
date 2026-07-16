import crypto from "crypto";

type NfceCompany = {
  addressLine?: string | null;
  city?: string | null;
  document?: string | null;
  fiscalEnvironment: string;
  legalName: string;
  nfceSeries: string;
  state?: string | null;
  stateTaxId?: string | null;
  tradeName: string;
  zipCode?: string | null;
};

type NfcePayment = {
  amount: number;
  method: string;
};

type NfceItem = {
  cfop?: string | null;
  cest?: string | null;
  name: string;
  ncm?: string | null;
  quantity: number;
  sku: string;
  totalPrice: number;
  unit: string;
  unitPrice: number;
};

export type NfceXmlInput = {
  accessKey: string;
  company: NfceCompany;
  items: NfceItem[];
  number: string;
  orderNumber: string;
  payments: NfcePayment[];
  series: string;
  total: number;
};

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function xml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(value: number) {
  return Number(value || 0).toFixed(2);
}

function qty(value: number) {
  return Number(value || 0).toFixed(4);
}

function normalizeText(value: string | null | undefined, fallback: string, maxLength = 60) {
  const normalized = (value ?? "").trim() || fallback;
  return normalized.slice(0, maxLength);
}

function paymentCode(method: string) {
  const map: Record<string, string> = {
    BANK_TRANSFER: "99",
    CASH: "01",
    CREDIT_CARD: "03",
    DEBIT_CARD: "04",
    PIX: "17",
    VOUCHER: "99"
  };

  return map[method] ?? "99";
}

function getMunicipality(company: NfceCompany) {
  const city = normalizeText(company.city, "Palmas", 60);
  const state = normalizeText(company.state, "TO", 2).toUpperCase();

  if (state === "TO" && city.toLowerCase() === "palmas") {
    return {
      code: "1721000",
      name: "Palmas"
    };
  }

  return {
    code: "1721000",
    name: city
  };
}

function getAddress(company: NfceCompany) {
  const raw = normalizeText(company.addressLine, "Endereco nao informado", 120);
  const [street, number] = raw.split(",").map((part) => part.trim());

  return {
    district: "Centro",
    number: number || "S/N",
    street: street || raw
  };
}

export function calculateNfeCheckDigit(base43: string) {
  const digits = onlyDigits(base43);

  if (digits.length !== 43) {
    throw new Error("Base da chave NFC-e deve ter 43 digitos.");
  }

  let weight = 2;
  let sum = 0;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const mod = sum % 11;
  const digit = 11 - mod;

  return digit >= 10 ? "0" : String(digit);
}

export function buildNfceAccessKey(input: {
  cnpj: string;
  issuedAt?: Date;
  number: string;
  randomCode: string;
  series: string;
  stateCode?: string;
}) {
  const issuedAt = input.issuedAt ?? new Date();
  const year = String(issuedAt.getFullYear()).slice(2);
  const month = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const base43 = [
    input.stateCode ?? "17",
    year,
    month,
    onlyDigits(input.cnpj).padStart(14, "0").slice(0, 14),
    "65",
    onlyDigits(input.series).padStart(3, "0").slice(0, 3),
    onlyDigits(input.number).padStart(9, "0").slice(0, 9),
    "1",
    onlyDigits(input.randomCode).padStart(8, "0").slice(0, 8)
  ].join("");

  return `${base43}${calculateNfeCheckDigit(base43)}`;
}

export function buildNfceXml(input: NfceXmlInput) {
  const municipality = getMunicipality(input.company);
  const address = getAddress(input.company);
  const cnpj = onlyDigits(input.company.document);
  const state = normalizeText(input.company.state, "TO", 2).toUpperCase();
  const now = new Date().toISOString();
  const tpAmb = input.company.fiscalEnvironment === "producao" ? "1" : "2";
  const productTotal = input.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const paymentTotal = input.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const troco = Math.max(0, paymentTotal - input.total);

  const detXml = input.items
    .map((item, index) => {
      const itemNumber = index + 1;
      const unit = normalizeText(item.unit, "UN", 6).toUpperCase();

      return `
    <det nItem="${itemNumber}">
      <prod>
        <cProd>${xml(item.sku)}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${xml(tpAmb === "2" ? `HOMOLOGACAO - ${item.name}` : item.name)}</xProd>
        <NCM>${xml(onlyDigits(item.ncm).padStart(8, "0").slice(0, 8))}</NCM>
        ${item.cest ? `<CEST>${xml(onlyDigits(item.cest).padStart(7, "0").slice(0, 7))}</CEST>` : ""}
        <CFOP>${xml(onlyDigits(item.cfop).padStart(4, "0").slice(0, 4))}</CFOP>
        <uCom>${xml(unit)}</uCom>
        <qCom>${qty(item.quantity)}</qCom>
        <vUnCom>${money(item.unitPrice)}</vUnCom>
        <vProd>${money(item.totalPrice)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${xml(unit)}</uTrib>
        <qTrib>${qty(item.quantity)}</qTrib>
        <vUnTrib>${money(item.unitPrice)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN102>
            <orig>0</orig>
            <CSOSN>102</CSOSN>
          </ICMSSN102>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>99</CST>
            <vBC>0.00</vBC>
            <pPIS>0.0000</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>99</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.0000</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>`;
    })
    .join("");

  const paymentsXml = input.payments
    .map(
      (payment) => `
      <detPag>
        <tPag>${paymentCode(payment.method)}</tPag>
        <vPag>${money(payment.amount)}</vPag>
      </detPag>`
    )
    .join("");

  const infNFe = `<infNFe Id="NFe${input.accessKey}" versao="4.00">
    <ide>
      <cUF>17</cUF>
      <cNF>${xml(input.accessKey.slice(35, 43))}</cNF>
      <natOp>VENDA</natOp>
      <mod>65</mod>
      <serie>${xml(input.series)}</serie>
      <nNF>${xml(input.number)}</nNF>
      <dhEmi>${now}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${municipality.code}</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${input.accessKey.slice(-1)}</cDV>
      <tpAmb>${tpAmb}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>RestaurantBrasil-0.1</verProc>
    </ide>
    <emit>
      <CNPJ>${xml(cnpj)}</CNPJ>
      <xNome>${xml(normalizeText(input.company.legalName, "Restaurant Brasil"))}</xNome>
      <xFant>${xml(normalizeText(input.company.tradeName, input.company.legalName))}</xFant>
      <enderEmit>
        <xLgr>${xml(address.street)}</xLgr>
        <nro>${xml(address.number)}</nro>
        <xBairro>${xml(address.district)}</xBairro>
        <cMun>${municipality.code}</cMun>
        <xMun>${xml(municipality.name)}</xMun>
        <UF>${xml(state)}</UF>
        <CEP>${xml(onlyDigits(input.company.zipCode).padStart(8, "0").slice(0, 8))}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>${xml(onlyDigits(input.company.stateTaxId))}</IE>
      <CRT>1</CRT>
    </emit>${detXml}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${money(productTotal)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${money(input.total)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>${paymentsXml}
      <vTroco>${money(troco)}</vTroco>
    </pag>
    <infAdic>
      <infCpl>${xml(tpAmb === "2" ? "NFC-e emitida em ambiente de homologacao - sem valor fiscal." : `Venda ${input.orderNumber}`)}</infCpl>
    </infAdic>
  </infNFe>`;

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  ${infNFe}
</NFe>`;
  const signatureDigest = crypto.createHash("sha1").update(infNFe).digest("base64");

  return {
    signatureDigest,
    signatureReference: `#NFe${input.accessKey}`,
    signatureStatus: "XML_READY_PENDING_SIGNATURE",
    xmlContent
  };
}
