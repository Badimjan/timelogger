import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Every secret is encrypted with a random per-session key that only the user's browser cookie holds,
// so the database on its own never contains anything that can be decrypted.
export const newKey = (): Buffer => randomBytes(32);

// Output format: base64(iv).base64(authTag).base64(ciphertext)
export function encrypt(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string, key: Buffer): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
