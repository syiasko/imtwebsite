// MCP tools for managing the IMT website content, served by api/mcp.js. The
// acting panel user comes from the AI token (ctx.session).
//
// Role rules match the admin panel and the database policies: an editor
// manages categories, vehicles and messages; settings, greeting, deleting
// messages and users need an admin. Queries run with the service-role key,
// which bypasses row level security, so these checks are what enforce roles.
import { z } from "zod";
import sharp from "sharp";
import { slugify } from "../src/utils/slug.js";
import { buildMapsEmbedUrl } from "../src/data/initialData.js";
import { MAX_PHOTOS, PHOTO_FULL, PHOTO_SMALL, mediaKey, mediaUrl } from "../src/lib/media.js";
import { must, supabaseAdmin } from "../server/supabase.mjs";
import { deleteMediaKeys, newPhotoKey, putObject, smallKey } from "../server/r2.mjs";
import { readGreeting, writeGreeting } from "../server/greeting.mjs";
import { ROLES, createStaffUser } from "../server/users.mjs";

// Public CDN domain of the R2 bucket (R2 custom domain, not r2.dev, which
// some Indonesian ISPs block). A site-relative base is made absolute below.
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || process.env.VITE_MEDIA_BASE_URL || "";

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

const imageSummary = (base) => (src, index) =>
  /^https?:/.test(src)
    ? { index, type: "url", url: src }
    : { index, type: "uploaded", url: mediaUrl(base, src) };

const vehiclePath = (v) => `/produk/${v.slug || slugify(v.name) || v.id}`;

const toDate = (ts) => (ts ? new Date(ts).toISOString() : null);

// Mirrors the panel (src/utils/imageCompression.js): JPEG in a full and a
// small size, shrinking quality then dimensions to fit each byte budget.
const encodeJpeg = async (input, { maxDim, maxBytes }) => {
  let dim = maxDim;
  let quality = 85;
  let buf = null;
  for (let i = 0; i < 14; i++) {
    buf = await sharp(input)
      .rotate()
      .resize({ width: dim, height: dim, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality })
      .toBuffer();
    if (buf.length <= maxBytes) return buf;
    if (quality > 60) quality = Math.max(60, quality - 8);
    else {
      dim = Math.round(dim * 0.85);
      quality = 75;
    }
  }
  return buf;
};

export const preparePhoto = async (input) => {
  await sharp(input).metadata(); // throws on non-images
  const [full, small] = await Promise.all([
    encodeJpeg(input, PHOTO_FULL),
    encodeJpeg(input, PHOTO_SMALL),
  ]);
  return { full, small };
};

// Collection-style access over the Supabase tables, so each tool reads like
// the panel's data model (camelCase vehicles, profiles as "users").
const toVehicle = (r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  categoryId: r.category_id,
  tagline: r.tagline,
  description: r.description,
  youtubeUrl: r.youtube_url,
  images: r.images || [],
  specs: r.specs || {},
  features: r.features || [],
});
const fromVehicle = (v) => ({
  id: v.id,
  slug: v.slug,
  name: v.name,
  category_id: v.categoryId,
  tagline: v.tagline || "",
  description: v.description || "",
  youtube_url: v.youtubeUrl || "",
  images: (v.images || []).map((src) => mediaKey(MEDIA_BASE_URL, src)),
  specs: v.specs || {},
  features: v.features || [],
});
const TABLE = { users: "profiles" };
const ORDER = { contact_messages: ["created_at", { ascending: false }], users: ["username"] };

const store = {
  list: async (name) => {
    const [col, opts] = ORDER[name] || ["id"];
    const rows = must(await supabaseAdmin().from(TABLE[name] || name).select("*").order(col, opts));
    return name === "vehicles" ? rows.map(toVehicle) : rows;
  },
  get: async (name, id) => {
    if (name === "settings") {
      if (id === "greeting") return readGreeting();
      return must(await supabaseAdmin().from("settings").select("data").eq("id", id).maybeSingle())?.data || null;
    }
    const row = must(await supabaseAdmin().from(TABLE[name] || name).select("*").eq("id", id).maybeSingle());
    return row && name === "vehicles" ? toVehicle(row) : row;
  },
  set: async (name, id, data) => {
    if (name === "vehicles") return must(await supabaseAdmin().from("vehicles").upsert(fromVehicle(data)));
    if (name === "users") {
      return must(await supabaseAdmin().from("profiles").update({ name: data.name, role: data.role }).eq("id", id));
    }
    return must(await supabaseAdmin().from(name).upsert(data));
  },
  merge: async (name, id, patch) => {
    if (id === "greeting") return writeGreeting(patch);
    const current = (await store.get(name, id)) || {};
    return must(await supabaseAdmin().from("settings").upsert({ id, data: { ...current, ...patch } }));
  },
  remove: async (name, id) => {
    if (name === "users") {
      const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
      if (error) throw error;
      return;
    }
    const gone = must(await supabaseAdmin().from(name).delete().eq("id", id).select());
    if (name === "vehicles") await deleteMediaKeys(gone.flatMap((r) => r.images || []));
  },
  deleteCategory: async (id) => {
    const units = must(await supabaseAdmin().from("vehicles").select("images").eq("category_id", id));
    must(await supabaseAdmin().from("categories").delete().eq("id", id)); // vehicles cascade
    await deleteMediaKeys(units.flatMap((u) => u.images || []));
  },
  setMessageStatus: async (id, status) =>
    must(await supabaseAdmin().from("contact_messages").update({ status }).eq("id", id)),
};

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{
 *   session: () => Promise<{ uid: string, username: string, role: string }>,
 *   siteUrl?: string,
 *   environment?: object,
 * }} ctx
 */
export function registerTools(server, ctx) {
  const { session } = ctx;
  const SITE_URL = (ctx.siteUrl || "").replace(/\/$/, "");
  const PUBLIC_MEDIA = MEDIA_BASE_URL.startsWith("/") ? SITE_URL + MEDIA_BASE_URL : MEDIA_BASE_URL;

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
        images: (v.images || []).map(imageSummary(PUBLIC_MEDIA)),
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

  server.registerTool(
    "add_vehicle_photos",
    {
      description: `Add photos to a vehicle from base64 image data (jpg/png/webp; read the user's file and send its contents) or by linking public image URLs. Uploaded images are resized like the admin panel (max ${PHOTO_FULL.maxDim}px) and served from the CDN. Max ${MAX_PHOTOS} photos per vehicle; the first photo is the cover.`,
      inputSchema: {
        id: z.string().describe("Vehicle id or slug"),
        base64: z
          .array(z.string())
          .optional()
          .describe("Image file contents as base64 (or data: URLs)"),
        urls: z.array(z.string().url()).optional().describe("Public https image URLs to link"),
        asCover: z.boolean().optional().describe("Put the new photos first"),
      },
      annotations: writes,
    },
    handler(async ({ id, urls = [], base64 = [], asCover }) => {
      await session();
      const v = await findVehicle(id);
      const existing = v.images || [];
      const count = urls.length + base64.length;
      if (!count) throw new Error("Isi salah satu: base64 atau urls.");
      if (existing.length + count > MAX_PHOTOS) {
        throw new Error(
          `Unit ini sudah punya ${existing.length} foto; maksimal ${MAX_PHOTOS}. Hapus sebagian dengan arrange_vehicle_photos.`
        );
      }
      const added = [];
      const sizesKB = [];
      for (const b of base64) {
        const buf = Buffer.from(b.replace(/^data:[^,]*,/, ""), "base64");
        const photo = await preparePhoto(buf).catch(() => {
          throw new Error("Data base64 bukan gambar yang valid.");
        });
        const key = newPhotoKey(v.id);
        await Promise.all([
          putObject(key, photo.full, "image/jpeg"),
          putObject(smallKey(key), photo.small, "image/jpeg"),
        ]);
        added.push(key);
        sizesKB.push(Math.round(photo.full.length / 1024));
      }
      added.push(...urls);
      const images = asCover ? [...added, ...existing] : [...existing, ...added];
      await store.set("vehicles", v.id, { ...v, images });
      return { vehicle: v.name, added: added.length, totalPhotos: images.length, sizesKB };
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
      await deleteMediaKeys(images.filter((_, i) => !keep.includes(i)));
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
        catalogPdf: catalogPdfUrl || "none (website uses the printable catalog)",
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

  server.registerTool(
    "set_catalog_pdf",
    {
      description:
        "Set the downloadable catalog (admin only): link a PDF URL, or clear it so the site falls back to the printable catalog. To upload a new PDF file, use the panel's Company Setting page.",
      inputSchema: {
        url: z.string().url().optional().describe("PDF URL (e.g. Google Drive)"),
        clear: z.boolean().optional(),
      },
      annotations: writes,
    },
    handler(async ({ url, clear }) => {
      await requireAdmin();
      if (!url === !clear) throw new Error("Isi salah satu: url atau clear.");
      const previous = (await store.get("settings", "company"))?.catalogPdfUrl || "";
      await store.merge("settings", "company", {
        catalogPdfUrl: clear ? "" : url,
        catalogPdfName: clear ? "" : decodeURIComponent(new URL(url).pathname.split("/").pop() || "katalog.pdf"),
      });
      await deleteMediaKeys([mediaKey(MEDIA_BASE_URL, previous)]);
      return clear ? "Katalog PDF dihapus; website memakai katalog cetak." : { catalog: url };
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
        role: z.enum(ROLES),
      },
      annotations: writes,
    },
    handler(async ({ username, password, name, role }) => {
      await requireAdmin();
      const created = await createStaffUser({ username, password, name, role });
      return { created: created.username, role };
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
