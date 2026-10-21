// Staff log in with a username; Supabase Auth needs an email, so each username
// maps to an address on a reserved .invalid domain (RFC 2606) that can never
// receive mail. Shared by the browser, api/* and the MCP server.
export const STAFF_EMAIL_DOMAIN = "staff.imt-karoseri.invalid";
export const USERNAME_RE = /^[a-z0-9._-]+$/;

export const staffEmail = (username) =>
  `${String(username).trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
