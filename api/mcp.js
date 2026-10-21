// Hosted MCP endpoint (Streamable HTTP, stateless) on Vercel: POST /api/mcp
// with "Authorization: Bearer imt_..." from the panel's Akses AI page. The
// token acts as the panel user who created it, with that user's current role;
// revoking the token, expiry, or removing the user cuts access on the next
// request.
import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SERVER_INFO, SERVER_INSTRUCTIONS, registerTools } from "../mcp/tools.mjs";
import { readJson, sendJson } from "../server/http.mjs";
import { must, supabaseAdmin } from "../server/supabase.mjs";
import { hashSecret, parseToken } from "../src/utils/aiToken.js";

// last_used_at is rewritten at most this often, to spare database writes.
const TOUCH_INTERVAL_MS = 60 * 1000;

const rpcError = (res, status, message, headers = {}) =>
  sendJson(res, status, { jsonrpc: "2.0", error: { code: -32001, message }, id: null }, headers);

const unauthorized = (res, message) =>
  rpcError(res, 401, message, {
    "WWW-Authenticate": 'Bearer realm="imt-admin", error="invalid_token"',
  });

const sameHash = (a, b) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Returns { token, user } | { expired } | { noAccess } | null.
const authenticate = async (header) => {
  const parsed = parseToken(/^Bearer\s+(.+)$/i.exec(header || "")?.[1]?.trim());
  if (!parsed) return null;
  const sb = supabaseAdmin();
  const token = must(await sb.from("ai_tokens").select("*").eq("id", parsed.id).maybeSingle());
  if (!token || !sameHash(await hashSecret(parsed.secret), token.token_hash)) return null;
  if (token.expires_at && Date.parse(token.expires_at) < Date.now()) return { expired: true };
  const profile = must(
    await sb.from("profiles").select("id, username, role").eq("id", token.user_id).maybeSingle()
  );
  if (!profile || !["admin", "editor"].includes(profile.role)) return { noAccess: true };
  return { token, user: { uid: profile.id, username: profile.username, role: profile.role } };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    // Stateless server: no standalone SSE stream and no sessions to delete.
    return rpcError(res, 405, "Method not allowed", { Allow: "POST" });
  }

  let auth;
  try {
    auth = await authenticate(req.headers.authorization);
  } catch (err) {
    console.error("MCP auth lookup failed:", err);
    return rpcError(res, 503, `Server MCP belum siap: ${err.message}`);
  }
  if (!auth) return unauthorized(res, "Token tidak valid. Buat token baru di panel admin, menu Akses AI.");
  if (auth.expired) return unauthorized(res, "Token sudah kedaluwarsa. Buat token baru di menu Akses AI.");
  if (auth.noAccess) return unauthorized(res, "Pemilik token ini sudah tidak punya akses ke panel admin.");

  let body;
  try {
    body = await readJson(req);
  } catch {
    return rpcError(res, 400, "Body bukan JSON yang valid.");
  }

  // Record activity for the panel's session list.
  const now = Date.now();
  const messages = Array.isArray(body) ? body : [body];
  const init = messages.find((m) => m?.method === "initialize");
  const touch = {};
  if (!auth.token.last_used_at || now - Date.parse(auth.token.last_used_at) > TOUCH_INTERVAL_MS) {
    touch.last_used_at = new Date(now).toISOString();
  }
  if (init) {
    const ci = init.params?.clientInfo;
    touch.last_used_at = new Date(now).toISOString();
    touch.last_client = ci?.name ? `${ci.name}${ci.version ? ` ${ci.version}` : ""}`.slice(0, 80) : "";
  }
  const touched = Object.keys(touch).length
    ? supabaseAdmin()
        .from("ai_tokens")
        .update(touch)
        .eq("id", auth.token.id)
        .then(({ error }) => error && console.error("token touch failed:", error))
    : null;

  const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });
  registerTools(server, {
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
