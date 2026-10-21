// One-off migration: Firestore catalog -> Supabase, base64 photos/PDF -> R2.
//
//   node --env-file=.env.local scripts/migrate-firestore-to-supabase.mjs \
//     [--messages messages.json] [--users users.json --passwords-out file] [--dry-run]
//
// Categories, vehicles and settings/company are read through Firestore's public
// REST API. Contact messages aren't public, so they come from a JSON export
// ([{ name, email, phone, company, subject, message, status, created_at,
// updated_at }]). Panel users can't keep their old passwords (the old hashes
// are unsalted SHA-256, which Supabase Auth can't import): each listed user
// ([{ username, name, role }]) gets a random temporary password written to
// --passwords-out. Re-running is safe: rows are upserted by id and photos
// already migrated (same source hash) are reused.
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { must, supabaseAdmin } from "../server/supabase.mjs";
import { putObject, smallKey } from "../server/r2.mjs";
import { createStaffUser } from "../server/users.mjs";
import { preparePhoto } from "../mcp/tools.mjs";

const FIRESTORE =
  "https://firestore.googleapis.com/v1/projects/imtwebsite-ddf59/databases/(default)/documents";

const { values: args } = parseArgs({
  options: {
    messages: { type: "string" },
    users: { type: "string" },
    "passwords-out": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
const dry = args["dry-run"];
const log = (...a) => console.log(...a);

// --- Firestore REST decoding ------------------------------------------------
const decode = (v) => {
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) {
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)])
    );
  }
  return undefined;
};
const docToObj = (d) => ({
  id: d.name.split("/").pop(),
  ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, decode(v)])),
});

const readCollection = async (name) => {
  const out = [];
  let pageToken = "";
  do {
    const url = `${FIRESTORE}/${name}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore ${name}: ${res.status} ${await res.text()}`);
    const json = await res.json();
    out.push(...(json.documents || []).map(docToObj));
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return out;
};

const readDoc = async (path) => {
  const res = await fetch(`${FIRESTORE}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${path}: ${res.status}`);
  return docToObj(await res.json());
};

// --- Media ------------------------------------------------------------------
const dataUrlBuffer = (s) => Buffer.from(s.slice(s.indexOf(",") + 1), "base64");
const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 32);

// Content-addressed keys make re-runs reuse photos instead of duplicating.
const migratePhoto = async (vehicleId, src) => {
  if (!src?.startsWith("data:")) return src; // already a URL
  const buf = dataUrlBuffer(src);
  const folder = vehicleId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const key = `vehicles/${folder}/${sha(buf)}.jpg`;
  if (!dry) {
    const photo = await preparePhoto(buf);
    await putObject(key, photo.full, "image/jpeg");
    await putObject(smallKey(key), photo.small, "image/jpeg");
  }
  return key;
};

const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || "";

const migratePdf = async (src) => {
  if (!src?.startsWith("data:")) return src || "";
  const buf = dataUrlBuffer(src);
  const key = `catalog/${sha(buf)}.pdf`;
  if (!dry) await putObject(key, buf, "application/pdf");
  return `${MEDIA_BASE_URL}/${key}`;
};

// --- Run ----------------------------------------------------------------------
const sb = supabaseAdmin();
const upsert = async (table, rows) => {
  if (!rows.length || dry) return;
  for (let i = 0; i < rows.length; i += 50) {
    must(await sb.from(table).upsert(rows.slice(i, i + 50)));
  }
};

log(dry ? "DRY RUN: nothing is written" : "Migrating to Supabase + R2");

const categories = await readCollection("categories");
await upsert(
  "categories",
  categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug || c.id,
    description: c.description || "",
    icon: c.icon || "tag",
  }))
);
log(`categories: ${categories.length}`);

const vehicles = await readCollection("vehicles");
const known = new Set(categories.map((c) => c.id));
const orphans = vehicles.filter((v) => !known.has(v.categoryId));
if (orphans.length) log(`skipped (category missing): ${orphans.map((v) => v.id).join(", ")}`);
let photos = 0;
const vehicleRows = [];
for (const v of vehicles.filter((x) => known.has(x.categoryId))) {
  const images = [];
  for (const src of (v.images || []).slice(0, 10)) {
    images.push(await migratePhoto(v.id, src));
    photos += 1;
  }
  vehicleRows.push({
    id: v.id,
    slug: v.slug || v.id,
    name: v.name,
    category_id: v.categoryId,
    tagline: v.tagline || "",
    description: v.description || "",
    youtube_url: v.youtubeUrl || "",
    images,
    specs: v.specs || {},
    features: (v.features || []).filter(Boolean),
  });
  process.stdout.write(`\rvehicles: ${vehicleRows.length}/${vehicles.length}, photos: ${photos}`);
}
await upsert("vehicles", vehicleRows);
log("");

const company = await readDoc("settings/company");
if (company) {
  const { id, passwordHash, ...data } = company;
  data.catalogPdfUrl = await migratePdf(data.catalogPdfUrl);
  await upsert("settings", [{ id: "company", data }]);
  log(`settings/company: ${Object.keys(data).length} fields (passwordHash dropped)`);
}

if (args.messages) {
  const messages = JSON.parse(readFileSync(args.messages, "utf8"));
  // No natural id: skip messages already present (same sender + timestamp).
  const existing = dry ? [] : must(await sb.from("contact_messages").select("name, created_at"));
  const seen = new Set(existing.map((m) => `${m.name}|${new Date(m.created_at).toISOString()}`));
  const fresh = messages.filter((m) => !seen.has(`${m.name}|${new Date(m.created_at).toISOString()}`));
  if (!dry && fresh.length) {
    must(
      await sb.from("contact_messages").insert(
        fresh.map((m) => ({
          name: m.name,
          email: m.email || "",
          phone: m.phone || "",
          company: m.company || "",
          subject: m.subject || "",
          message: m.message,
          status: m.status || "New",
          created_at: m.created_at,
          updated_at: m.updated_at || null,
        }))
      )
    );
  }
  log(`contact_messages: ${fresh.length} new of ${messages.length}`);
}

if (args.users) {
  if (!args["passwords-out"]) throw new Error("--users needs --passwords-out");
  const users = JSON.parse(readFileSync(args.users, "utf8"));
  const lines = [];
  for (const u of users) {
    const password = randomBytes(9).toString("base64url");
    if (dry) {
      lines.push(`${u.username} (${u.role}): <dry run>`);
      continue;
    }
    try {
      await createStaffUser({ ...u, password });
      lines.push(`${u.username} (${u.role}): ${password}`);
    } catch (err) {
      lines.push(`${u.username}: not created (${err.message})`);
    }
  }
  writeFileSync(
    args["passwords-out"],
    `Temporary passwords. Hand each to its owner, then delete this file.\n${lines.join("\n")}\n`,
    { mode: 0o600 }
  );
  log(`users: ${users.length} processed, passwords in ${args["passwords-out"]}`);
}

log("done");
