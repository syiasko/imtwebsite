// Service-role Supabase client for api/* and scripts. It bypasses row level
// security, so every caller checks the acting user's role first.
import { createClient } from "@supabase/supabase-js";
import { HttpError, bearer } from "./http.mjs";

let client = null;
export const supabaseAdmin = () => {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
      throw new HttpError(503, "SUPABASE_URL / SUPABASE_SECRET_KEY belum di-set di server.");
    }
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};

export const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Resolves the panel user behind "Authorization: Bearer <supabase access token>".
export const requireStaff = async (req, { admin = false } = {}) => {
  const token = bearer(req);
  if (!token) throw new HttpError(401, "Belum login.");
  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Sesi login tidak valid. Login ulang.");
  const profile = must(
    await sb.from("profiles").select("id, username, role").eq("id", data.user.id).maybeSingle()
  );
  if (!profile || !["admin", "editor"].includes(profile.role)) {
    throw new HttpError(403, "Akun ini tidak punya akses ke panel admin.");
  }
  if (admin && profile.role !== "admin") {
    throw new HttpError(403, "Hanya role admin yang boleh melakukan ini.");
  }
  return { uid: profile.id, username: profile.username, role: profile.role };
};
