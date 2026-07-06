const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function importKey(base64Key: string) {
  const bytes = Buffer.from(base64Key, "base64");
  if (bytes.length !== 32) throw new Error("Note encryption key must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptEnvelope(plaintext: string, base64Key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(base64Key);
  const encrypted = await crypto.subtle.encrypt(
    { iv, name: "AES-GCM" },
    key,
    encoder.encode(plaintext)
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptEnvelope(ciphertext: string, base64Key: string) {
  const [version, encodedIv, encodedPayload, extra] = ciphertext.split(".");
  if (version !== "v1" || !encodedIv || !encodedPayload || extra) {
    throw new Error("Unsupported note ciphertext format");
  }
  const key = await importKey(base64Key);
  const decrypted = await crypto.subtle.decrypt(
    { iv: fromBase64Url(encodedIv), name: "AES-GCM" },
    key,
    fromBase64Url(encodedPayload)
  );
  return decoder.decode(decrypted);
}

export function requireNoteEncryptionKey() {
  const key = process.env.SYRA_NOTE_ENCRYPTION_KEY;
  if (!key) throw new Error("Learner note encryption is not configured");
  if (Buffer.from(key, "base64").length !== 32)
    throw new Error("Learner note encryption key is invalid");
  return key;
}
