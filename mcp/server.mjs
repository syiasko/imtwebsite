#!/usr/bin/env node
// MCP server for managing the IMT website content from an AI agent session
// (Claude Code, Codex, ...). It logs in as a normal admin-panel user through
// Firebase Auth, so Firestore rules and the user's role apply exactly as in
// the /dapurnyaimt panel: an editor can manage categories, vehicles and
// messages; settings, greeting and users need an admin.
//
// Credentials come from the environment, never from this repo:
//   IMT_ADMIN_USERNAME, IMT_ADMIN_PASSWORD
// Set VITE_FIREBASE_EMULATORS=1 to work against local emulators instead.
//
// stdout carries the MCP protocol; log only to stderr.
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import sharp from "sharp";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  USE_EMULATORS,
  auth,
  db,
  firebaseConfig,
  staffEmail,
} from "../src/firebase/config.js";
import {
  STATUS_NEW,
  STATUS_READ,
  STATUS_REPLIED,
  createStaffAccount,
  deleteCategoryDoc,
  deleteContactMessage,
  deleteUserDoc,
  deleteVehicleDoc,
  saveCategory,
  saveCompany,
  saveGreeting,
  saveUser,
  saveVehicle,
  updateContactMessageStatus,
} from "../src/firebase/api.js";
import { slugify } from "../src/utils/slug.js";
import { buildMapsEmbedUrl } from "../src/data/initialData.js";

// Optional, e.g. https://example.com; without it links are site-relative paths.
const SITE_URL = (process.env.IMT_SITE_URL || "").replace(/\/$/, "");
// Same limits as the admin panel (AdminVehicles / imageCompression / AdminSettings).
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 90 * 1024;
const MAX_IMAGE_DIM = 1280;
const MAX_PDF_BYTES = 800 * 1024;
const VEHICLE_DOC_BUDGET = 1000 * 1024; // Firestore caps a document at 1 MiB

// --- Session ---------------------------------------------------------------
let sessionPromise = null;
const session = () => {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const username = process.env.IMT_ADMIN_USERNAME?.trim().toLowerCase();
      const password = process.env.IMT_ADMIN_PASSWORD;
      if (!username || !password) {
        throw new Error(
          "IMT_ADMIN_USERNAME dan IMT_ADMIN_PASSWORD belum di-set di environment MCP server."
        );
      }
      try {
        const cred = await signInWithEmailAndPassword(
          auth,
          staffEmail(username),
          password
        );
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const role = snap.exists() ? snap.data().role : null;
        if (role !== "admin" && role !== "editor") {
          throw new Error(`Akun "${username}" tidak punya akses ke panel admin.`);
        }
        return { uid: cred.user.uid, username, role };
      } catch (err) {
        if (/invalid-credential|wrong-password|user-not-found/.test(err?.code || "")) {
          throw new Error("Login gagal: username atau password salah.");
        }
        throw err;
      }
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
};

const requireAdmin = async () => {
  const s = await session();
  if (s.role !== "admin") {
    throw new Error(
      `Akun "${s.username}" ber-role editor. Fitur ini hanya untuk role admin.`
    );
  }
  return s;
};

// --- Helpers ---------------------------------------------------------------
const readAll = async (name) =>
  (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() }));

const readOne = async (name, id) => {
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

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
      err?.code === "permission-denied"
        ? "Ditolak oleh Firestore rules: role akun ini tidak boleh melakukan aksi tersebut."
        : err?.message || String(err);
    return { isError: true, content: [{ type: "text", text: msg }] };
  }
};

const findVehicle = async (ref) => {
  const vehicles = await readAll("vehicles");
  const key = String(ref).trim().toLowerCase();
  const v =
    vehicles.find((x) => x.id === ref) ||
    vehicles.find((x) => x.slug === key) ||
    vehicles.find((x) => slugify(x.name) === key);
  if (!v) throw new Error(`Unit "${ref}" tidak ditemukan. Pakai list_vehicles untuk melihat id.`);
  return v;
};

const imageSummary = (src, index) =>
  src?.startsWith("data:")
    ? { index, type: "uploaded", sizeKB: Math.round(src.length / 1024) }
    : { index, type: "url", url: src };

const vehiclePath = (v) => `/produk/${v.slug || slugify(v.name) || v.id}`;

const docSize = (obj) => Buffer.byteLength(JSON.stringify(obj), "utf8");

// Mirrors the browser compressor: JPEG, longest side <= 1280, shrink quality
// then dimensions until the data URL fits in ~90 KB.
const compressImageFile = async (path) => {
  const input = await readFile(path);
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

// --- Server ----------------------------------------------------------------
const server = new McpServer(
  { name: "imt-admin", version: "1.0.0" },
  {
    instructions:
      "Mengelola konten website IMT Karoseri (kategori, unit kendaraan, foto, pengaturan perusahaan, greeting signage, pesan kontak, pengguna panel). " +
      "Perubahan langsung tayang di website. Sebelum menghapus atau mengubah banyak data sekaligus, tampilkan dulu ringkasannya ke user dan minta konfirmasi. " +
      "Pakai id dari tool list_* saat mengubah data.",
  }
);

const readOnly = { readOnlyHint: true, openWorldHint: false };
const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const destroys = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

server.registerTool(
  "whoami",
  {
    description: "Show which panel account this server is logged in as, its role, and the Firebase project.",
    inputSchema: {},
    annotations: readOnly,
  },
  handler(async () => {
    const s = await session();
    return {
      username: s.username,
      role: s.role,
      project: firebaseConfig.projectId,
      emulator: USE_EMULATORS,
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
    const [cats, vehicles] = await Promise.all([readAll("categories"), readAll("vehicles")]);
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
    const current = id ? await readOne("categories", id) : null;
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
    await saveCategory(next);
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
    const cat = await readOne("categories", id);
    if (!cat) throw new Error(`Kategori "${id}" tidak ditemukan.`);
    const units = (await readAll("vehicles")).filter((v) => v.categoryId === id);
    await deleteCategoryDoc(id);
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
    return (await readAll("vehicles"))
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

const specsSchema = z
  .record(z.string(), z.string())
  .describe('Spec name to value, e.g. {"Chassis": "Hino 500", "Kapasitas": "8.000 L"}. Replaces all specs.');

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
      specs: specsSchema.optional(),
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
    if (input.categoryId && !(await readOne("categories", input.categoryId))) {
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
    await saveVehicle(next);
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
    description: `Add photos to a vehicle from local image files (jpg/png/webp) or public image URLs. Files are compressed like the admin panel (max ${MAX_IMAGE_DIM}px, ~90 KB). Max ${MAX_IMAGES} photos per vehicle; the first photo is the cover.`,
    inputSchema: {
      id: z.string().describe("Vehicle id or slug"),
      files: z.array(z.string()).optional().describe("Absolute paths of image files on this computer"),
      urls: z.array(z.string().url()).optional().describe("Public https image URLs to link"),
      asCover: z.boolean().optional().describe("Put the new photos first"),
    },
    annotations: writes,
  },
  handler(async ({ id, files = [], urls = [], asCover }) => {
    await session();
    const v = await findVehicle(id);
    const existing = v.images || [];
    if (!files.length && !urls.length) throw new Error("Isi files atau urls.");
    if (existing.length + files.length + urls.length > MAX_IMAGES) {
      throw new Error(
        `Unit ini sudah punya ${existing.length} foto; maksimal ${MAX_IMAGES}. Hapus sebagian dengan arrange_vehicle_photos.`
      );
    }
    const added = [];
    for (const f of files) {
      const info = await stat(f).catch(() => null);
      if (!info?.isFile()) throw new Error(`File tidak ditemukan: ${f}`);
      const dataUrl = await compressImageFile(f);
      added.push(dataUrl);
    }
    added.push(...urls);
    const images = asCover ? [...added, ...existing] : [...existing, ...added];
    const next = { ...v, images };
    if (docSize(next) > VEHICLE_DOC_BUDGET) {
      throw new Error("Total ukuran foto melebihi batas 1 MB per unit di Firestore. Kurangi jumlah foto.");
    }
    await saveVehicle(next);
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
    await saveVehicle({ ...v, images: keep.map((i) => images[i]) });
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
    await deleteVehicleDoc(v.id);
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
    const { passwordHash, catalogPdfUrl, ...rest } = (await readOne("settings", "company")) || {};
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
    await saveCompany(changes);
    return { updated: Object.keys(changes) };
  })
);

server.registerTool(
  "set_catalog_pdf",
  {
    description:
      "Set the downloadable catalog (admin only): upload a local PDF (max 800 KB), link an external PDF URL, or clear it so the site falls back to the printable catalog.",
    inputSchema: {
      file: z.string().optional().describe("Absolute path to a PDF file"),
      url: z.string().url().optional().describe("External PDF URL (e.g. Google Drive)"),
      clear: z.boolean().optional(),
    },
    annotations: writes,
  },
  handler(async ({ file, url, clear }) => {
    await requireAdmin();
    if ([file, url, clear].filter(Boolean).length !== 1) {
      throw new Error("Isi salah satu: file, url, atau clear.");
    }
    if (clear) {
      await saveCompany({ catalogPdfUrl: "", catalogPdfName: "" });
      return "Katalog PDF dihapus; website memakai katalog cetak.";
    }
    if (url) {
      await saveCompany({ catalogPdfUrl: url, catalogPdfName: url });
      return { catalog: url };
    }
    const buf = await readFile(file);
    if (buf.subarray(0, 4).toString() !== "%PDF") throw new Error("File bukan PDF.");
    if (buf.length > MAX_PDF_BYTES) {
      throw new Error(
        `PDF ${Math.round(buf.length / 1024)} KB, maksimal 800 KB. Kompres dulu atau pakai url.`
      );
    }
    await saveCompany({
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
    return (await readOne("settings", "greeting")) || {};
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
    await saveGreeting(changes);
    return { updated: changes };
  })
);

// Contact messages
const STATUSES = [STATUS_NEW, STATUS_READ, STATUS_REPLIED];
const msgDate = (m) => m.created_at?.toDate?.().toISOString() || null;

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
    return (await readAll("contact_messages"))
      .map((m) => ({ ...m, status: m.status || STATUS_NEW, date: msgDate(m) }))
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
    const m = await readOne("contact_messages", id);
    if (!m) throw new Error(`Pesan "${id}" tidak ditemukan.`);
    const { created_at, updated_at, ...rest } = m;
    return { ...rest, status: m.status || STATUS_NEW, date: msgDate(m) };
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
    await updateContactMessageStatus(id, status);
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
    await deleteContactMessage(id);
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
    return (await readAll("users")).map((u) => ({
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
    const users = await readAll("users");
    if (users.some((u) => u.username === username)) {
      throw new Error(`Username "${username}" sudah dipakai.`);
    }
    let uid;
    try {
      uid = await createStaffAccount(username, password);
    } catch (err) {
      if (err?.code === "auth/email-already-in-use") {
        throw new Error(
          `Username "${username}" sudah terdaftar di Firebase Auth. Pakai username lain, atau hapus akun lamanya di Firebase Console.`
        );
      }
      throw err;
    }
    const now = new Date().toISOString();
    await saveUser({
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
    const u = await readOne("users", id);
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
    await saveUser(next);
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
    const u = await readOne("users", id);
    if (!u) throw new Error(`User "${id}" tidak ditemukan.`);
    await deleteUserDoc(id);
    return { removed: u.username };
  })
);

await server.connect(new StdioServerTransport());
console.error(
  `imt-admin MCP server ready (${USE_EMULATORS ? "emulator" : firebaseConfig.projectId})`
);
