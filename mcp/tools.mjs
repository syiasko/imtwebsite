// MCP tools for managing the IMT website content. Shared by the local stdio
// server (mcp/server.mjs) and the hosted endpoint (api/mcp.js); each passes a
// `store` backend and a `session` resolver for the acting panel user.
//
// Role rules match the admin panel and firestore.rules: an editor manages
// categories, vehicles and messages; settings, greeting, deleting messages and
// users need an admin. The hosted endpoint uses the Admin SDK, which bypasses
// Firestore rules, so these checks are what enforces roles there.
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import sharp from "sharp";
import { slugify } from "../src/utils/slug.js";
import { buildMapsEmbedUrl } from "../src/data/initialData.js";

// Same limits as the admin panel (AdminVehicles / imageCompression / AdminSettings).
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 90 * 1024;
const MAX_IMAGE_DIM = 1280;
const MAX_PDF_BYTES = 800 * 1024;
const VEHICLE_DOC_BUDGET = 1000 * 1024; // Firestore caps a document at 1 MiB

const STATUS_NEW = "New";
const STATUSES = [STATUS_NEW, "Read", "Replied"];

export const SERVER_INFO = { name: "imt-admin", version: "1.1.0" };
export const SERVER_INSTRUCTIONS =
  "Mengelola konten website IMT Karoseri (kategori, unit kendaraan, foto, pengaturan perusahaan, greeting signage, pesan kontak, pengguna panel). " +
  "Perubahan langsung tayang di website. Sebelum menghapus atau mengubah banyak data sekaligus, tampilkan dulu ringkasannya ke user dan minta konfirmasi. " +
  "Pakai id dari tool list_* saat mengubah data.";

const ok = (data) => ({
  content: [
    { type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) },
  ],
});

// Wrap each handler so failures come back as readable tool errors.
const handler = (fn) => async (args) => {
  try {
    return ok(await fn(args));
  } catch (err) {
    const msg =
      err?.code === "permission-denied" || err?.code === 7
        ? "Ditolak oleh Firestore rules: role akun ini tidak boleh melakukan aksi tersebut."
        : err?.message || String(err);
    return { isError: true, content: [{ type: "text", text: msg }] };
  }
};

const imageSummary = (src, index) =>
  src?.startsWith("data:")
    ? { index, type: "uploaded", sizeKB: Math.round(src.length / 1024) }
    : { index, type: "url", url: src };

const vehiclePath = (v) => `/produk/${v.slug || slugify(v.name) || v.id}`;

const docSize = (obj) => Buffer.byteLength(JSON.stringify(obj), "utf8");

const toDate = (ts) => ts?.toDate?.().toISOString() || null;

// Mirrors the browser compressor: JPEG, longest side <= 1280, shrink quality
// then dimensions until the data URL fits in ~90 KB.
export const compressImage = async (input) => {
  const meta = await sharp(input).metadata();
  const asIs = `data:image/${meta.format};base64,${input.toString("base64")}`;
  if (asIs.length <= MAX_IMAGE_BYTES && ["jpeg", "png", "webp"].includes(meta.format)) {
    return asIs;
  }
  let dim = Math.min(MAX_IMAGE_DIM, Math.max(meta.width || 0, meta.height || 0) || MAX_IMAGE_DIM);
  let quality = 85;
  let out = "";
  for (let i = 0; i < 14; i++) {
    const buf = await sharp(input)
      .rotate()
      .resize({ width: dim, height: dim, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality })
      .toBuffer();
    out = `data:image/jpeg;base64,${buf.toString("base64")}`;
    if (out.length <= MAX_IMAGE_BYTES) return out;
    if (quality > 50) quality = Math.max(50, quality - 10);
    else if (dim > 480) {
      dim = Math.round(dim * 0.85);
      quality = 70;
    } else {
      dim = Math.max(360, Math.round(dim * 0.85));
      quality = Math.max(40, quality - 5);
    }
  }
  return out;
};

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{
 *   store: object,
 *   session: () => Promise<{ uid: string, username: string, role: string }>,
 *   siteUrl?: string,
 *   localFiles?: boolean,
 *   environment?: object,
 * }} ctx
 */
export function registerTools(server, ctx) {
  const { store, session, localFiles = false } = ctx;
  const SITE_URL = (ctx.siteUrl || "").replace(/\/$/, "");

  const requireAdmin = async () => {
    const s = await session();
    if (s.role !== "admin") {
      throw new Error(
        `Akun "${s.username}" ber-role editor. Fitur ini hanya untuk role admin.`
      );
    }
    return s;
  };

  const findVehicle = async (ref) => {
    const vehicles = await store.list("vehicles");
    const key = String(ref).trim().toLowerCase();
    const v =
      vehicles.find((x) => x.id === ref) ||
      vehicles.find((x) => x.slug === key) ||
      vehicles.find((x) => slugify(x.name) === key);
    if (!v) throw new Error(`Unit "${ref}" tidak ditemukan. Pakai list_vehicles untuk melihat id.`);
    return v;
  };

  const readOnly = { readOnlyHint: true, openWorldHint: false };
  const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const destroys = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

  server.registerTool(
    "whoami",
    {
      description: "Show which panel account this server acts as, its role, and where it is connected.",
      inputSchema: {},
      annotations: readOnly,
    },
    handler(async () => {
      const s = await session();
      return {
        username: s.username,
        role: s.role,
        ...ctx.environment,
        site: SITE_URL || "(IMT_SITE_URL belum di-set)",
      };
    })
  );

  // Categories
  server.registerTool(
    "list_categories",
    {
      description: "List vehicle categories with their unit counts.",
      inputSchema: {},
      annotations: readOnly,
    },
    handler(async () => {
      await session();
      const [cats, vehicles] = await Promise.all([store.list("categories"), store.list("vehicles")]);
      return cats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        units: vehicles.filter((v) => v.categoryId === c.id).length,
        url: `${SITE_URL}/produk/kategori/${c.slug}`,
      }));
    })
  );

  server.registerTool(
    "save_category",
    {
      description:
        "Create a category (omit id) or update one (give id; omitted fields keep their current value). Slug is derived from the name when not given.",
      inputSchema: {
        id: z.string().optional().describe("Existing category id to update"),
        name: z.string().min(1).optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
      },
      annotations: writes,
    },
    handler(async ({ id, name, slug, description }) => {
      await session();
      const current = id ? await store.get("categories", id) : null;
      if (id && !current) throw new Error(`Kategori "${id}" tidak ditemukan.`);
      const nextName = (name ?? current?.name ?? "").trim();
      if (!nextName) throw new Error("Nama kategori wajib diisi.");
      const nextSlug = slugify(slug ?? current?.slug ?? nextName);
      const next = {
        id: current?.id || nextSlug || `cat-${Date.now()}`,
        name: nextName,
        slug: nextSlug,
        description: (description ?? current?.description ?? "").trim(),
        icon: current?.icon || "tag",
      };
      await store.set("categories", next.id, next);
      return { saved: next, created: !current };
    })
  );

  server.registerTool(
    "delete_category",
    {
      description:
        "Delete a category AND every vehicle in it, permanently. Ask the user to confirm first, stating how many units will be removed (see list_categories).",
      inputSchema: { id: z.string() },
      annotations: destroys,
    },
    handler(async ({ id }) => {
      await session();
      const cat = await store.get("categories", id);
      if (!cat) throw new Error(`Kategori "${id}" tidak ditemukan.`);
      const units = (await store.list("vehicles")).filter((v) => v.categoryId === id);
      await store.deleteCategory(id);
      return { deleted: cat.name, unitsDeleted: units.map((u) => u.name) };
    })
  );

  // Vehicles
  server.registerTool(
    "list_vehicles",
    {
      description: "List vehicles (without photo data). Filter by category id and/or a search text on name/tagline.",
      inputSchema: {
        categoryId: z.string().optional(),
        search: z.string().optional(),
      },
      annotations: readOnly,
    },
    handler(async ({ categoryId, search }) => {
      await session();
      const q = search?.trim().toLowerCase();
      return (await store.list("vehicles"))
        .filter((v) => !categoryId || v.categoryId === categoryId)
        .filter(
          (v) =>
            !q ||
            `${v.name || ""} ${v.tagline || ""}`.toLowerCase().includes(q)
        )
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((v) => ({
          id: v.id,
          name: v.name,
          categoryId: v.categoryId,
          tagline: v.tagline || "",
          photos: (v.images || []).length,
          url: `${SITE_URL}${vehiclePath(v)}`,
        }));
    })
  );

  server.registerTool(
    "get_vehicle",
    {
      description: "Get one vehicle's full content: description, specs, features, video, and a summary of its photos.",
      inputSchema: { id: z.string().describe("Vehicle id or slug") },
      annotations: readOnly,
    },
    handler(async ({ id }) => {
      await session();
      const v = await findVehicle(id);
      return {
        ...v,
        images: (v.images || []).map(imageSummary),
        url: `${SITE_URL}${vehiclePath(v)}`,
      };
    })
  );

  server.registerTool(
    "save_vehicle",
    {
      description:
        "Create a vehicle (omit id; name and categoryId required) or update one (give id; omitted fields keep their current value). specs and features replace the whole list when given. Photos are managed with add_vehicle_photos / arrange_vehicle_photos.",
      inputSchema: {
        id: z.string().optional().describe("Existing vehicle id or slug to update"),
        name: z.string().min(1).optional(),
        categoryId: z.string().optional(),
        slug: z.string().optional(),
        tagline: z.string().optional(),
        description: z.string().optional(),
        youtubeUrl: z.string().optional().describe("YouTube URL, or empty string to remove"),
        specs: z
          .record(z.string(), z.string())
          .optional()
          .describe('Spec name to value, e.g. {"Chassis": "Hino 500", "Kapasitas": "8.000 L"}. Replaces all specs.'),
        features: z.array(z.string()).optional().describe("Replaces all features"),
      },
      annotations: writes,
    },
    handler(async (input) => {
      await session();
      const current = input.id ? await findVehicle(input.id) : null;
      const pick = (k) => (input[k] !== undefined ? input[k] : current?.[k]);
      const name = (pick("name") || "").trim();
      const categoryId = pick("categoryId");
      if (!name) throw new Error("Nama unit wajib diisi.");
      if (!categoryId) throw new Error("categoryId wajib diisi untuk unit baru.");
      if (input.categoryId && !(await store.get("categories", input.categoryId))) {
        throw new Error(`Kategori "${input.categoryId}" tidak ada. Lihat list_categories.`);
      }
      const id = current?.id || `v-${Date.now()}`;
      const next = {
        id,
        slug: slugify(pick("slug") || name || id),
        name,
        categoryId,
        tagline: (pick("tagline") || "").trim(),
        description: (pick("description") || "").trim(),
        youtubeUrl: (pick("youtubeUrl") || "").trim(),
        images: current?.images || [],
        specs: pick("specs") || {},
        features: (pick("features") || []).map((f) => f.trim()).filter(Boolean),
      };
      await store.set("vehicles", id, next);
      return {
        created: !current,
        id,
        name,
        url: `${SITE_URL}${vehiclePath(next)}`,
      };
    })
  );

  const photoInputs = {
    id: z.string().describe("Vehicle id or slug"),
    urls: z.array(z.string().url()).optional().describe("Public https image URLs to link"),
    base64: z
      .array(z.string())
      .optional()
      .describe("Image file contents as base64 (or data: URLs); compressed before saving"),
    asCover: z.boolean().optional().describe("Put the new photos first"),
  };
  if (localFiles) {
    photoInputs.files = z
      .array(z.string())
      .optional()
      .describe("Absolute paths of image files on this computer");
  }

  server.registerTool(
    "add_vehicle_photos",
    {
      description: `Add photos to a vehicle${localFiles ? " from local image files (jpg/png/webp)," : ""} from base64 image data, or by linking public image URLs. Images are compressed like the admin panel (max ${MAX_IMAGE_DIM}px, ~90 KB). Max ${MAX_IMAGES} photos per vehicle; the first photo is the cover.`,
      inputSchema: photoInputs,
      annotations: writes,
    },
    handler(async ({ id, files = [], urls = [], base64 = [], asCover }) => {
      await session();
      const v = await findVehicle(id);
      const existing = v.images || [];
      const count = files.length + urls.length + base64.length;
      if (!count) throw new Error("Isi salah satu: files, base64, atau urls.");
      if (existing.length + count > MAX_IMAGES) {
        throw new Error(
          `Unit ini sudah punya ${existing.length} foto; maksimal ${MAX_IMAGES}. Hapus sebagian dengan arrange_vehicle_photos.`
        );
      }
      const added = [];
      for (const f of files) {
        const info = await stat(f).catch(() => null);
        if (!info?.isFile()) throw new Error(`File tidak ditemukan: ${f}`);
        added.push(await compressImage(await readFile(f)));
      }
      for (const b of base64) {
        const buf = Buffer.from(b.replace(/^data:[^,]*,/, ""), "base64");
        added.push(
          await compressImage(buf).catch(() => {
            throw new Error("Data base64 bukan gambar yang valid.");
          })
        );
      }
      added.push(...urls);
      const images = asCover ? [...added, ...existing] : [...existing, ...added];
      const next = { ...v, images };
      if (docSize(next) > VEHICLE_DOC_BUDGET) {
        throw new Error("Total ukuran foto melebihi batas 1 MB per unit di Firestore. Kurangi jumlah foto.");
      }
      await store.set("vehicles", v.id, next);
      return {
        vehicle: v.name,
        added: added.length,
        totalPhotos: images.length,
        sizesKB: added.map((a) => (a.startsWith("data:") ? Math.round(a.length / 1024) : "url")),
      };
    })
  );

  server.registerTool(
    "arrange_vehicle_photos",
    {
      description:
        "Reorder or remove a vehicle's photos. Pass the indexes (from get_vehicle) to keep, in the new order; the first becomes the cover. Indexes left out are deleted.",
      inputSchema: {
        id: z.string().describe("Vehicle id or slug"),
        keep: z.array(z.number().int().min(0)),
      },
      annotations: destroys,
    },
    handler(async ({ id, keep }) => {
      await session();
      const v = await findVehicle(id);
      const images = v.images || [];
      const bad = keep.filter((i) => i >= images.length);
      if (bad.length) throw new Error(`Index foto tidak ada: ${bad.join(", ")} (unit ini punya ${images.length} foto).`);
      if (new Set(keep).size !== keep.length) throw new Error("Index foto tidak boleh dobel.");
      await store.set("vehicles", v.id, { ...v, images: keep.map((i) => images[i]) });
      return { vehicle: v.name, photos: keep.length, removed: images.length - keep.length };
    })
  );

  server.registerTool(
    "delete_vehicle",
    {
      description: "Delete a vehicle permanently. Confirm with the user first.",
      inputSchema: { id: z.string().describe("Vehicle id or slug") },
      annotations: destroys,
    },
    handler(async ({ id }) => {
      await session();
      const v = await findVehicle(id);
      await store.remove("vehicles", v.id);
      return { deleted: v.name };
    })
  );

  // Company settings
  const COMPANY_FIELDS = {
    name: "Nama perusahaan",
    shortName: "Nama singkat",
    tagline: "Tagline",
    phone: "Telepon",
    whatsapp: "Nomor WhatsApp",
    email: "Email",
    address: "Alamat",
    hours: "Jam operasional",
    youtubeUrl: "URL video YouTube di beranda",
    youtubeSectionTitle: "Judul bagian video",
    youtubeSectionSubtitle: "Subjudul bagian video",
    mapsShareUrl: "Link share Google Maps",
    mapsPlaceQuery: "Nama tempat untuk peta (embed dibuat ulang otomatis)",
    mapsEmbedUrl: "URL embed peta custom",
  };

  server.registerTool(
    "get_company_settings",
    {
      description: "Read the company identity, contact, video, maps and catalog settings shown on the website.",
      inputSchema: {},
      annotations: readOnly,
    },
    handler(async () => {
      await session();
      const { passwordHash, catalogPdfUrl, ...rest } = (await store.get("settings", "company")) || {};
      return {
        ...rest,
        catalogPdf: catalogPdfUrl
          ? catalogPdfUrl.startsWith("data:")
            ? `uploaded file (${Math.round(catalogPdfUrl.length / 1024)} KB)`
            : catalogPdfUrl
          : "none (website uses the printable catalog)",
      };
    })
  );

  server.registerTool(
    "update_company_settings",
    {
      description:
        "Update company settings (admin only). Only the given fields change. Changing mapsPlaceQuery rebuilds the map embed unless mapsEmbedUrl is also given.",
      inputSchema: Object.fromEntries(
        Object.entries(COMPANY_FIELDS).map(([k, d]) => [k, z.string().optional().describe(d)])
      ),
      annotations: writes,
    },
    handler(async (patch) => {
      await requireAdmin();
      const changes = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v.trim()])
      );
      if (!Object.keys(changes).length) throw new Error("Tidak ada field yang diubah.");
      if (changes.mapsPlaceQuery && !("mapsEmbedUrl" in changes)) {
        changes.mapsEmbedUrl = buildMapsEmbedUrl(changes.mapsPlaceQuery);
      }
      await store.merge("settings", "company", changes);
      return { updated: Object.keys(changes) };
    })
  );

  const pdfInputs = {
    url: z.string().url().optional().describe("External PDF URL (e.g. Google Drive)"),
    clear: z.boolean().optional(),
  };
  if (localFiles) pdfInputs.file = z.string().optional().describe("Absolute path to a PDF file");

  server.registerTool(
    "set_catalog_pdf",
    {
      description: `Set the downloadable catalog (admin only): ${localFiles ? "upload a local PDF (max 800 KB), " : ""}link an external PDF URL, or clear it so the site falls back to the printable catalog.`,
      inputSchema: pdfInputs,
      annotations: writes,
    },
    handler(async ({ file, url, clear }) => {
      await requireAdmin();
      if ([file, url, clear].filter(Boolean).length !== 1) {
        throw new Error(`Isi salah satu: ${localFiles ? "file, " : ""}url, atau clear.`);
      }
      if (clear) {
        await store.merge("settings", "company", { catalogPdfUrl: "", catalogPdfName: "" });
        return "Katalog PDF dihapus; website memakai katalog cetak.";
      }
      if (url) {
        await store.merge("settings", "company", { catalogPdfUrl: url, catalogPdfName: url });
        return { catalog: url };
      }
      const buf = await readFile(file);
      if (buf.subarray(0, 4).toString() !== "%PDF") throw new Error("File bukan PDF.");
      if (buf.length > MAX_PDF_BYTES) {
        throw new Error(
          `PDF ${Math.round(buf.length / 1024)} KB, maksimal 800 KB. Kompres dulu atau pakai url.`
        );
      }
      await store.merge("settings", "company", {
        catalogPdfUrl: `data:application/pdf;base64,${buf.toString("base64")}`,
        catalogPdfName: basename(file),
      });
      return { catalog: basename(file), sizeKB: Math.round(buf.length / 1024) };
    })
  );

  // Greeting signage
  server.registerTool(
    "get_greeting",
    {
      description: "Read the live greeting shown on the office signage TV.",
      inputSchema: {},
      annotations: readOnly,
    },
    handler(async () => {
      await session();
      return (await store.get("settings", "greeting")) || {};
    })
  );

  server.registerTool(
    "update_greeting",
    {
      description:
        "Update the signage greeting (admin only). Only the given fields change. The guest line reads: <guestGender> <guestName> (<guestTitle>) dari <guestCompany>.",
      inputSchema: {
        isActive: z.boolean().optional().describe("Show or hide the greeting bar"),
        text: z.string().optional().describe("Running welcome text"),
        guestGender: z.enum(["Bapak", "Ibu", "Bapak/Ibu"]).optional(),
        guestName: z.string().optional(),
        guestTitle: z.string().optional().describe("Job title, shown in brackets"),
        guestCompany: z.string().optional(),
      },
      annotations: writes,
    },
    handler(async (patch) => {
      await requireAdmin();
      const changes = Object.fromEntries(
        Object.entries(patch)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
      );
      if (!Object.keys(changes).length) throw new Error("Tidak ada field yang diubah.");
      await store.merge("settings", "greeting", changes);
      return { updated: changes };
    })
  );

  // Contact messages
  server.registerTool(
    "list_messages",
    {
      description: "List contact-form messages, newest first. New = unread.",
      inputSchema: {
        status: z.enum(STATUSES).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: readOnly,
    },
    handler(async ({ status, limit = 20 }) => {
      await session();
      return (await store.list("contact_messages"))
        .map((m) => ({ ...m, status: m.status || STATUS_NEW, date: toDate(m.created_at) }))
        .filter((m) => !status || m.status === status)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, limit)
        .map((m) => ({
          id: m.id,
          date: m.date,
          status: m.status,
          name: m.name,
          company: m.company || "",
          subject: m.subject || "",
          preview: (m.message || "").slice(0, 120),
        }));
    })
  );

  server.registerTool(
    "get_message",
    {
      description: "Read one contact message in full. Does not change its status.",
      inputSchema: { id: z.string() },
      annotations: readOnly,
    },
    handler(async ({ id }) => {
      await session();
      const m = await store.get("contact_messages", id);
      if (!m) throw new Error(`Pesan "${id}" tidak ditemukan.`);
      const { created_at, updated_at, ...rest } = m;
      return { ...rest, status: m.status || STATUS_NEW, date: toDate(created_at) };
    })
  );

  server.registerTool(
    "set_message_status",
    {
      description: "Mark a contact message as New, Read or Replied.",
      inputSchema: { id: z.string(), status: z.enum(STATUSES) },
      annotations: writes,
    },
    handler(async ({ id, status }) => {
      await session();
      if (!(await store.get("contact_messages", id))) throw new Error(`Pesan "${id}" tidak ditemukan.`);
      await store.setMessageStatus(id, status);
      return { id, status };
    })
  );

  server.registerTool(
    "delete_message",
    {
      description: "Delete a contact message permanently (admin only). Confirm with the user first.",
      inputSchema: { id: z.string() },
      annotations: destroys,
    },
    handler(async ({ id }) => {
      await requireAdmin();
      await store.remove("contact_messages", id);
      return { deleted: id };
    })
  );

  // Panel users
  server.registerTool(
    "list_users",
    {
      description: "List admin-panel users and their roles (admin only).",
      inputSchema: {},
      annotations: readOnly,
    },
    handler(async () => {
      const s = await requireAdmin();
      return (await store.list("users")).map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name || "",
        role: u.role,
        you: u.id === s.uid,
      }));
    })
  );

  server.registerTool(
    "create_user",
    {
      description:
        "Create an admin-panel login (admin only). The password passes through this chat, so tell the user to have the new person change it on the panel's Ganti password page.",
      inputSchema: {
        username: z.string().regex(/^[a-z0-9._-]+$/, "huruf kecil, angka, titik, garis bawah, tanda hubung"),
        password: z.string().min(6),
        name: z.string().optional(),
        role: z.enum(["admin", "editor"]),
      },
      annotations: writes,
    },
    handler(async ({ username, password, name, role }) => {
      await requireAdmin();
      const users = await store.list("users");
      if (users.some((u) => u.username === username)) {
        throw new Error(`Username "${username}" sudah dipakai.`);
      }
      let uid;
      try {
        uid = await store.createAuthUser(username, password);
      } catch (err) {
        if (/email-already-(in-use|exists)/.test(err?.code || "")) {
          throw new Error(
            `Username "${username}" sudah terdaftar di Firebase Auth. Pakai username lain, atau hapus akun lamanya di Firebase Console.`
          );
        }
        throw err;
      }
      const now = new Date().toISOString();
      await store.set("users", uid, {
        id: uid,
        username,
        name: name?.trim() || username,
        role,
        createdAt: now,
        updatedAt: now,
      });
      return { created: username, role };
    })
  );

  server.registerTool(
    "update_user",
    {
      description: "Change a panel user's display name or role (admin only). Passwords can't be changed here.",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        role: z.enum(["admin", "editor"]).optional(),
      },
      annotations: writes,
    },
    handler(async ({ id, name, role }) => {
      const s = await requireAdmin();
      const u = await store.get("users", id);
      if (!u) throw new Error(`User "${id}" tidak ditemukan.`);
      if (id === s.uid && role && role !== "admin") {
        throw new Error("Tidak bisa menurunkan role akun sendiri.");
      }
      const next = {
        ...u,
        name: name?.trim() || u.name,
        role: role || u.role,
        updatedAt: new Date().toISOString(),
      };
      await store.set("users", id, next);
      return { username: u.username, name: next.name, role: next.role };
    })
  );

  server.registerTool(
    "remove_user",
    {
      description: "Revoke a user's access to the admin panel (admin only). Confirm with the user first.",
      inputSchema: { id: z.string() },
      annotations: destroys,
    },
    handler(async ({ id }) => {
      const s = await requireAdmin();
      if (id === s.uid) throw new Error("Tidak bisa menghapus akun sendiri.");
      const u = await store.get("users", id);
      if (!u) throw new Error(`User "${id}" tidak ditemukan.`);
      await store.remove("users", id);
      return { removed: u.username };
    })
  );
}
