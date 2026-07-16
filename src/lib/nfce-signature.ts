import { readFile } from "fs/promises";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";

function normalizeCertificatePem(pem: string) {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\r?\n|\s/g, "");
}

function extractA1Credentials(pfxBuffer: Buffer, password: string) {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  const keyBags = p12.getBags({
    bagType: forge.pki.oids.pkcs8ShroudedKeyBag
  })[forge.pki.oids.pkcs8ShroudedKeyBag];
  const certBags = p12.getBags({
    bagType: forge.pki.oids.certBag
  })[forge.pki.oids.certBag];
  const privateKey = keyBags?.[0]?.key;
  const certificate = certBags?.[0]?.cert;

  if (!privateKey || !certificate) {
    throw new Error("Nao foi possivel extrair chave privada e certificado do A1.");
  }

  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
  const certificatePem = forge.pki.certificateToPem(certificate);

  return {
    certificateBase64: normalizeCertificatePem(certificatePem),
    certificatePem,
    privateKeyPem
  };
}

export async function signNfceXmlWithA1(input: {
  certificatePassword: string;
  certificatePath: string;
  xmlContent: string;
}) {
  const pfxBuffer = await readFile(input.certificatePath);
  const credentials = extractA1Credentials(pfxBuffer, input.certificatePassword);
  const signer = new SignedXml({
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    getKeyInfoContent: () => `<X509Data><X509Certificate>${credentials.certificateBase64}</X509Certificate></X509Data>`,
    idAttribute: "Id",
    privateKey: credentials.privateKeyPem,
    publicCert: credentials.certificatePem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1"
  });

  signer.addReference({
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    ],
    xpath: "//*[local-name(.)='infNFe']"
  });
  signer.computeSignature(input.xmlContent, {
    location: {
      action: "after",
      reference: "//*[local-name(.)='infNFe']"
    }
  });

  const signedXml = signer.getSignedXml();
  const signatureXml = signer.getSignatureXml();

  return {
    signedXml,
    signatureXml
  };
}
