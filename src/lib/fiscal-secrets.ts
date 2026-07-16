import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const runtimeDir = path.join(process.cwd(), ".runtime", "fiscal-certificates");

function getKey() {
  const secret = process.env.FISCAL_SECRET_KEY ?? process.env.AUTH_SECRET ?? "restaurant-brasil-dev-fiscal-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptFiscalSecret(value: string | null | undefined) {
  const plain = value?.trim();

  if (!plain) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptFiscalSecret(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const [iv, tag, encrypted] = value.split(".");

  if (!iv || !tag || !encrypted) {
    return value;
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return "Configurado";
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function saveFiscalCertificate(file: File) {
  const extension = path.extname(file.name).toLowerCase();

  if (![".pfx", ".p12"].includes(extension)) {
    throw new Error("Envie um certificado A1 nos formatos .pfx ou .p12.");
  }

  if (file.size <= 0) {
    throw new Error("O arquivo do certificado esta vazio.");
  }

  if (file.size > 1024 * 1024 * 2) {
    throw new Error("O certificado deve ter no maximo 2 MB.");
  }

  await mkdir(runtimeDir, { recursive: true });

  const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const targetPath = path.join(runtimeDir, safeName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, bytes, { mode: 0o600 });

  return {
    fileName: file.name,
    path: targetPath
  };
}
