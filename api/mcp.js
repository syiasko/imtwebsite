// Hosted MCP endpoint (Streamable HTTP, stateless) on Vercel: POST /api/mcp
// with "Authorization: Bearer imt_..." from the panel's Akses AI page. The
// token acts as the panel user who created it, with that user's current role;
// removing the user or the token cuts access on the next request.
import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SERVER_INFO, SERVER_INSTRUCTIONS, registerTools } from "../mcp/tools.mjs";
import { hashSecret, parseToken } from "../src/utils/aiToken.js";

// lastUsedAt is rewritten at most this often, to spare Firestore writes.
const TOUCH_INTERVAL_MS = 60 * 1000;

const jsonRpcError = (res, status, message, extraHeaders = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...extraHeaders });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message }, id: null }));
};

const unauthorized = (res, message) =>
  jsonRpcError(res, 401, message, {
    "WWW-Authenticate": 'Bearer realm="imt-admin", error="invalid_token"',
  });

const sameHash = (a, b) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// The Admin SDK needs FIREBASE_SERVICE_ACCOUNT; load it lazily so a missing
// key answers with a clear 503 instead of crashing the function.
let adminPromise = null;
const loadAdmin = () => {
  if (!adminPromise) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIRESTORE_EMULATOR_HOST) {
      return Promise.reject(new Error("FIREBASE_SERVICE_ACCOUNT belum di-set di Vercel."));
    }
    adminPromise = import("../mcp/store-admin.mjs").catch((err) => {
      adminPromise = null;
      throw err;
    });
  }
  return adminPromise;
};

// Returns { tokenRef, token, user } or null.
const authenticate = async (adminDb, header) => {
  const parsed = parseToken(/^Bearer\s+(.+)$/i.exec(header || "")?.[1]?.trim());
  if (!parsed) return null;
  const tokenRef = adminDb.collection("ai_tokens").doc(parsed.id);
  const snap = await tokenRef.get();
  if (!snap.exists) return null;
  const token = snap.data();
  if (!sameHash(await hashSecret(parsed.secret), token.tokenHash || "")) return null;
  if (token.expiresAt && Date.parse(token.expiresAt) < Date.now()) return { expired: true };
  const userSnap = await adminDb.collection("users").doc(token.uid).get();
  const user = userSnap.exists ? userSnap.data() : null;
  if (user?.role !== "admin" && user?.role !== "editor") return { noAccess: true };
  return { tokenRef, token, user: { uid: token.uid, username: user.username, role: user.role } };
};

const readBody = async (req) => {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    // Stateless server: no standalone SSE stream and no sessions to delete.
    return jsonRpcError(res, 405, "Method not allowed", { Allow: "POST" });
  }

  let auth, adminStore;
  try {
    const admin = await loadAdmin();
    adminStore = admin.adminStore;
    auth = await authenticate(admin.adminDb, req.headers.authorization);
  } catch (err) {
    console.error("MCP auth lookup failed:", err);
    return jsonRpcError(res, 503, `Server MCP belum siap: ${err.message}`);
  }
  if (!auth) return unauthorized(res, "Token tidak valid. Buat token baru di panel admin, menu Akses AI.");
  if (auth.expired) return unauthorized(res, "Token sudah kedaluwarsa. Buat token baru di menu Akses AI.");
  if (auth.noAccess) return unauthorized(res, "Pemilik token ini sudah tidak punya akses ke panel admin.");

  let body;
  try {
    body = await readBody(req);
  } catch {
    return jsonRpcError(res, 400, "Body bukan JSON yang valid.");
  }

  // Record activity for the panel's session list.
  const now = Date.now();
  const messages = Array.isArray(body) ? body : [body];
  const init = messages.find((m) => m?.method === "initialize");
  const touch = {};
  if (!auth.token.lastUsedAt || now - Date.parse(auth.token.lastUsedAt) > TOUCH_INTERVAL_MS) {
    touch.lastUsedAt = new Date(now).toISOString();
  }
  if (init) {
    const ci = init.params?.clientInfo;
    touch.lastUsedAt = new Date(now).toISOString();
    touch.lastClient = ci?.name ? `${ci.name}${ci.version ? ` ${ci.version}` : ""}`.slice(0, 80) : "";
  }
  const touched = Object.keys(touch).length
    ? auth.tokenRef.update(touch).catch((err) => console.error("token touch failed:", err))
    : null;

  const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });
  registerTools(server, {
    store: adminStore,
    session: async () => auth.user,
    siteUrl: process.env.IMT_SITE_URL || `https://${req.headers.host}`,
    environment: { transport: "http", token: auth.token.name },
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
  // Vercel may freeze the function once the response ends; finish the write.
  await touched;
}
