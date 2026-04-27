// Lightweight password hashing using SubtleCrypto. NOT a substitute for real auth —
// only protects the admin panel against casual access since the hash lives in Firestore.

export const sha256Hex = async (input) => {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const DEFAULT_ADMIN_PASSWORD = "imt-admin";

export const verifyAdminPassword = async (input, storedHash) => {
  if (!storedHash) return input === DEFAULT_ADMIN_PASSWORD;
  return (await sha256Hex(input)) === storedHash;
};
