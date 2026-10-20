import assert from "node:assert/strict";
import { test } from "node:test";
import { decrypt, encrypt, newKey } from "../lib/crypto.ts";

test("a secret decrypts only with the key it was encrypted with", () => {
  const key = newKey();
  const payload = encrypt(JSON.stringify({ kind: "password", username: "u", password: "p@ss wörd" }), key);
  assert.equal(JSON.parse(decrypt(payload, key)).password, "p@ss wörd");
  assert.throws(() => decrypt(payload, newKey()));
});

test("the stored payload never contains the plain secret", () => {
  const payload = encrypt("super-secret-token", newKey());
  assert.ok(!payload.includes("super-secret-token"));
});

test("tampering with the payload is detected", () => {
  const key = newKey();
  const [iv, tag, data] = encrypt("hello", key).split(".");
  const flipped = Buffer.from(data, "base64");
  flipped[0] ^= 1;
  assert.throws(() => decrypt([iv, tag, flipped.toString("base64")].join("."), key));
});
