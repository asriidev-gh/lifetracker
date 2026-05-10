import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SCRYPT_SALT = "lifetracker-password-manager";
const PAYLOAD_VERSION = "v1";

function getSecretWord(): string {
  const secret = process.env.PASSWORD_MANAGER_SECRET_WORD?.trim();
  if (!secret) {
    throw new Error("PASSWORD_MANAGER_SECRET_WORD is not configured");
  }
  return secret;
}

function deriveKey(): Buffer {
  const secret = getSecretWord();
  return crypto.scryptSync(secret, SCRYPT_SALT, KEY_LEN);
}

export function encryptPassword(plainPassword: string) {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const payload = `${PAYLOAD_VERSION}:${plainPassword}`;
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPassword: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptPassword(input: {
  encryptedPassword: string;
  iv: string;
  authTag: string;
}) {
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(input.iv, "base64"));
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(input.encryptedPassword, "base64")),
    decipher.final(),
  ]).toString("utf8");

  const prefix = `${PAYLOAD_VERSION}:`;
  if (!decrypted.startsWith(prefix)) {
    throw new Error("Invalid encrypted payload version");
  }
  return decrypted.slice(prefix.length);
}
