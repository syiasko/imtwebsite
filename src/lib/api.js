// Browser data access: Supabase for catalog/settings/messages/users/tokens,
// R2 (through /api/media) for files, Firestore only for the signage greeting.
// Rows are mapped to the camelCase shapes the UI has always used.
import { doc, onSnapshot } from "firebase/firestore";
import { db as firestore } from "../firebase/config";
import { MEDIA_BASE_URL, supabase } from "./supabase";
import { mediaKey, mediaUrl } from "./media";

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Calls our own /api/* functions with the current Supabase session.
export const apiFetch = async (path, body) => {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Permintaan gagal (${res.status}).`);
  return json;
};

// --- Mapping --------------------------------------------------------------
export const toVehicle = (r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  categoryId: r.category_id,
  tagline: r.tagline,
  description: r.description,
  youtubeUrl: r.youtube_url,
  images: (r.images || []).map((k) => mediaUrl(MEDIA_BASE_URL, k)),
  thumbs: (r.images || []).map((k) => mediaUrl(MEDIA_BASE_URL, k, "sm")),
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
  images: (v.images || []).map((u) => mediaKey(MEDIA_BASE_URL, u)),
  specs: v.specs || {},
  features: v.features || [],
});

// --- Catalog --------------------------------------------------------------
export const fetchCategories = async () =>
  must(
    await supabase
      .from("categories")
      .select("id, name, slug, description, icon")
      .order("id")
  );

export const fetchVehicles = async () =>
  must(await supabase.from("vehicles").select("*").order("id")).map(toVehicle);

export const saveCategory = async (category) =>
  must(await supabase.from("categories").upsert(category));

export const deleteCategory = async (id) => {
  const units = must(
    await supabase.from("vehicles").select("images").eq("category_id", id)
  );
  must(await supabase.from("categories").delete().eq("id", id)); // vehicles cascade
  await deleteMedia(units.flatMap((u) => u.images)).catch(() => {});
};

export const saveVehicle = async (vehicle) =>
  must(await supabase.from("vehicles").upsert(fromVehicle(vehicle)));

export const deleteVehicle = async (vehicle) => {
  must(await supabase.from("vehicles").delete().eq("id", vehicle.id));
  await deleteMedia(vehicle.images || []).catch(() => {});
};

// --- Company settings -----------------------------------------------------
export const fetchCompany = async () =>
  must(await supabase.from("settings").select("data").eq("id", "company").maybeSingle())
    ?.data || null;

export const saveCompany = async (patch) => {
  const current = (await fetchCompany()) || {};
  must(
    await supabase
      .from("settings")
      .upsert({ id: "company", data: { ...current, ...patch } })
  );
};

// --- Greeting (Firestore, read by the signage TV) -------------------------
export const subscribeGreeting = (cb, onError) =>
  onSnapshot(
    doc(firestore, "settings", "greeting"),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (err) => onError?.(err)
  );

export const saveGreeting = (patch) => apiFetch("/api/greeting", patch);

// --- Contact messages -----------------------------------------------------
export const STATUS_NEW = "New";
export const STATUS_READ = "Read";
export const STATUS_REPLIED = "Replied";

export const saveContactMessage = async (form) =>
  must(
    await supabase.from("contact_messages").insert({
      name: form.name,
      email: form.email || "",
      phone: form.phone || "",
      company: form.company || "",
      subject: form.subject || "",
      message: form.message,
    })
  );

export const fetchMessages = async () =>
  must(
    await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
  );

export const updateMessageStatus = async (id, status) =>
  must(await supabase.from("contact_messages").update({ status }).eq("id", id));

export const deleteMessage = async (id) =>
  must(await supabase.from("contact_messages").delete().eq("id", id));

// --- Staff profiles -------------------------------------------------------
export const fetchProfile = async (uid) =>
  must(
    await supabase
      .from("profiles")
      .select("id, username, name, role")
      .eq("id", uid)
      .maybeSingle()
  );

export const fetchProfiles = async () =>
  must(
    await supabase.from("profiles").select("id, username, name, role").order("username")
  );

// Creating/removing accounts touches auth.users, so it runs server-side.
export const adminUsers = (body) => apiFetch("/api/admin-users", body);

// --- AI tokens ------------------------------------------------------------
const toToken = (r) => ({
  id: r.id,
  uid: r.user_id,
  name: r.name,
  prefix: r.prefix,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  lastUsedAt: r.last_used_at,
  lastClient: r.last_client,
});

export const fetchAiTokens = async () =>
  must(await supabase.from("ai_tokens").select("*")).map(toToken);

export const createAiToken = async ({ id, uid, name, prefix, tokenHash, expiresAt }) =>
  must(
    await supabase.from("ai_tokens").insert({
      id,
      user_id: uid,
      name,
      prefix,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
  );

export const deleteAiToken = async (id) =>
  must(await supabase.from("ai_tokens").delete().eq("id", id));

// --- Live updates (admin panel) -------------------------------------------
export const subscribeChanges = (tables, cb) => {
  const channel = supabase.channel(`changes-${tables.join("-")}-${Math.random()}`);
  tables.forEach((table) =>
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => cb(table))
  );
  channel.subscribe();
  return () => supabase.removeChannel(channel);
};

// --- Media (R2) -----------------------------------------------------------
const putFile = async (url, blob, contentType) => {
  const res = await fetch(url, {
    method: "PUT",
    // Must match the headers the URL was signed with (server/r2.mjs).
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload ke storage gagal (${res.status}).`);
};

// Uploads a compressed photo and its small variant; returns the public URL.
export const uploadPhoto = async (vehicleId, full, small) => {
  const { key, url, urlSm } = await apiFetch("/api/media", {
    action: "presign-photo",
    vehicleId,
  });
  await Promise.all([putFile(url, full, "image/jpeg"), putFile(urlSm, small, "image/jpeg")]);
  return mediaUrl(MEDIA_BASE_URL, key);
};

export const uploadCatalogPdf = async (file) => {
  const { key, url } = await apiFetch("/api/media", {
    action: "presign-pdf",
    size: file.size,
  });
  await putFile(url, file, "application/pdf");
  return mediaUrl(MEDIA_BASE_URL, key);
};

// Accepts URLs or keys; only files in our bucket are deleted.
export const deleteMedia = async (srcs) => {
  const keys = srcs.map((s) => mediaKey(MEDIA_BASE_URL, s)).filter((k) => k && !/^(https?:|data:)/.test(k));
  if (keys.length) await apiFetch("/api/media", { action: "delete", keys });
};
