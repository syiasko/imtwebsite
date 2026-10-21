// Saves the signage greeting (admin only). It stays in Firestore because the
// TV app reads it there; see server/greeting.mjs.
import { jsonHandler } from "../server/http.mjs";
import { requireStaff } from "../server/supabase.mjs";
import { writeGreeting } from "../server/greeting.mjs";

export default jsonHandler(async (req, body) => {
  await requireStaff(req, { admin: true });
  return { saved: await writeGreeting(body) };
});
