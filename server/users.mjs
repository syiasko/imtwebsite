// Creating a panel account touches Supabase Auth and profiles together.
// Used by api/admin-users.js, the MCP tools and the migration script.
import { HttpError } from "./http.mjs";
import { must, supabaseAdmin } from "./supabase.mjs";
import { USERNAME_RE, staffEmail } from "../src/lib/staff.js";

export const ROLES = ["admin", "editor"];

export const createStaffUser = async ({ username, password, name, role }) => {
  const clean = String(username || "").trim().toLowerCase();
  if (!USERNAME_RE.test(clean)) {
    throw new HttpError(400, "Username hanya boleh huruf kecil, angka, titik, garis bawah, dan tanda hubung.");
  }
  if (!ROLES.includes(role)) throw new HttpError(400, "Role harus admin atau editor.");
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpError(400, "Password minimal 6 karakter.");
  }
  const sb = supabaseAdmin();
  const taken = must(await sb.from("profiles").select("id").eq("username", clean).maybeSingle());
  if (taken) throw new HttpError(409, `Username "${clean}" sudah dipakai.`);
  const { data, error } = await sb.auth.admin.createUser({
    email: staffEmail(clean),
    password,
    email_confirm: true,
  });
  if (error) {
    throw new HttpError(
      error.status === 422 ? 409 : 400,
      error.code === "email_exists" ? `Username "${clean}" sudah terdaftar.` : error.message
    );
  }
  const { error: profileError } = await sb.from("profiles").insert({
    id: data.user.id,
    username: clean,
    name: String(name || "").trim() || clean,
    role,
  });
  if (profileError) {
    await sb.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }
  return { id: data.user.id, username: clean, role };
};

