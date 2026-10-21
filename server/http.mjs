// Small helpers for the Vercel functions in api/.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const readJson = async (req) => {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body || "null") : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
};

export const sendJson = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};

export const bearer = (req) => /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "")?.[1]?.trim();

// POST-only JSON endpoint; HttpErrors become { error } responses.
export const jsonHandler = (fn) => async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, { Allow: "POST" });
  try {
    let body;
    try {
      body = (await readJson(req)) || {};
    } catch {
      throw new HttpError(400, "Body bukan JSON yang valid.");
    }
    sendJson(res, 200, (await fn(req, body)) ?? { ok: true });
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err);
    sendJson(res, err.status || 500, { error: err instanceof HttpError ? err.message : "Terjadi kesalahan di server." });
  }
};
