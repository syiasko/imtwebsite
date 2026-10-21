// Panel account management (admin only). Accounts live in Supabase Auth with
// a profiles row for username/name/role; both are changed together here.
// POST { action: "create", username, password, name, role }
// POST { action: "update", id, name, role }
// POST { action: "reset-password", id, password }
// POST { action: "delete", id }
import { HttpError, jsonHandler } from "../server/http.mjs";
import { must, requireStaff, supabaseAdmin } from "../server/supabase.mjs";
import { ROLES, createStaffUser } from "../server/users.mjs";

export default jsonHandler(async (req, body) => {
  const me = await requireStaff(req, { admin: true });
  const sb = supabaseAdmin();
  const target = async () => {
    const p = must(await sb.from("profiles").select("*").eq("id", body.id || "").maybeSingle());
    if (!p) throw new HttpError(404, "User tidak ditemukan.");
    return p;
  };

  switch (body.action) {
    case "create":
      return createStaffUser(body);
    case "update": {
      const p = await target();
      if (body.role !== undefined && !ROLES.includes(body.role)) {
        throw new HttpError(400, "Role harus admin atau editor.");
      }
      if (p.id === me.uid && body.role && body.role !== "admin") {
        throw new HttpError(400, "Anda tidak bisa menurunkan role akun sendiri.");
      }
      const patch = {
        name: body.name !== undefined ? String(body.name).trim() || p.username : p.name,
        role: body.role || p.role,
      };
      must(await sb.from("profiles").update(patch).eq("id", p.id));
      return { id: p.id, username: p.username, ...patch };
    }
    case "reset-password": {
      const p = await target();
      if (typeof body.password !== "string" || body.password.length < 6) {
        throw new HttpError(400, "Password minimal 6 karakter.");
      }
      const { error } = await sb.auth.admin.updateUserById(p.id, { password: body.password });
      if (error) throw new HttpError(400, error.message);
      return { id: p.id, username: p.username };
    }
    case "delete": {
      const p = await target();
      if (p.id === me.uid) throw new HttpError(400, "Tidak bisa menghapus akun sendiri.");
      const { error } = await sb.auth.admin.deleteUser(p.id); // profile + tokens cascade
      if (error) throw new HttpError(400, error.message);
      return { deleted: p.username };
    }
    default:
      throw new HttpError(400, "action tidak dikenal.");
  }
});
