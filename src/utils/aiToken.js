// AI access tokens for the hosted MCP endpoint (/api/mcp).
// Format: imt_<16-char id>_<43-char secret>. The ai_tokens table keeps the row
// with only the SHA-256 of the secret, so a leaked database can't be replayed.
// Shared by the admin panel (browser) and api/mcp.js (Node); both have
// crypto.getRandomValues and crypto.subtle.

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_RE = /^imt_([A-Za-z0-9]{16})_([A-Za-z0-9_-]{43})$/;

// Seen within this window counts as an active session in the panel.
export const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const hashSecret = async (secret) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const generateToken = async () => {
  const idBytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(idBytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
  const secret = base64url(crypto.getRandomValues(new Uint8Array(32)));
  return {
    id,
    token: `imt_${id}_${secret}`,
    prefix: `imt_${id.slice(0, 6)}`,
    tokenHash: await hashSecret(secret),
  };
};

export const parseToken = (token) => {
  const m = TOKEN_RE.exec(token || "");
  return m ? { id: m[1], secret: m[2] } : null;
};
