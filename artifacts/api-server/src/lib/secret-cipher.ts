import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";
const KEY_DERIVATION_SALT = "deploybro-db-url-v1";

let keyCache: Buffer | null = null;

function getKey(): Buffer {
  if (keyCache) return keyCache;
  const raw = process.env.DATABASE_URL_ENC_KEY;
  if (!raw) {
    throw new Error("DATABASE_URL_ENC_KEY is not configured");
  }

  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    try {
      const decoded = Buffer.from(raw, "base64");
      if (decoded.length === 32) {
        key = decoded;
      } else {
        key = scryptSync(raw, KEY_DERIVATION_SALT, 32);
      }
    } catch {
      key = scryptSync(raw, KEY_DERIVATION_SALT, 32);
    }
  }

  if (key.length !== 32) {
    throw new Error("DATABASE_URL_ENC_KEY must derive a 32-byte key");
  }
  keyCache = key;
  return key;
}

export function isEncrypted(blob: string | null | undefined): boolean {
  return typeof blob === "string" && blob.startsWith(PREFIX);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(blob: string): string {
  if (!blob.startsWith(PREFIX)) {
    throw new Error("Stored secret is not encrypted with the current scheme");
  }
  const buf = Buffer.from(blob.slice(PREFIX.length), "base64");
  if (buf.length < 28) {
    throw new Error("Encrypted blob is malformed");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
