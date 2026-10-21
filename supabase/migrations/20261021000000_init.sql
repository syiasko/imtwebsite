-- IMT website schema. Public visitors read the catalog; staff (profiles.role
-- admin/editor) manage it; settings and users are admin-only. Mirrors the
-- previous firestore.rules. Photos live in R2; vehicles.images holds R2 keys
-- (or full https URLs for linked images).

-- Profiles: one per staff account, created by the server (api/admin-users).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]+$'),
  name text not null default '',
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role helpers. security definer so policies can read profiles without
-- recursing into the profiles policies.
create function public.current_staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_staff() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.current_staff_role() in ('admin', 'editor'), false)
$$;

create function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.current_staff_role() = 'admin', false)
$$;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create table public.categories (
  id text primary key,
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique,
  description text not null default '',
  icon text not null default 'tag',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id text primary key,
  slug text not null,
  name text not null check (char_length(name) between 1 and 300),
  category_id text not null references public.categories (id) on delete cascade,
  tagline text not null default '',
  description text not null default '',
  youtube_url text not null default '',
  images text[] not null default '{}' check (cardinality(images) <= 10),
  specs jsonb not null default '{}'::jsonb,
  features text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_category_id_idx on public.vehicles (category_id);
create index vehicles_slug_idx on public.vehicles (slug);

-- Key/value settings; 'company' holds the company identity shown on the site.
-- The signage greeting stays in Firestore (the TV app reads it there).
create table public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null default '' check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 50),
  company text not null default '' check (char_length(company) <= 200),
  subject text not null default '' check (char_length(subject) <= 300),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'New' check (status in ('New', 'Read', 'Replied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);

-- Tokens for the hosted MCP endpoint; only the SHA-256 of the secret is kept.
create table public.ai_tokens (
  id text primary key check (id ~ '^[A-Za-z0-9]{16}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  prefix text not null,
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  last_client text not null default ''
);
create index ai_tokens_user_id_idx on public.ai_tokens (user_id);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger vehicles_touch before update on public.vehicles
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
create trigger contact_messages_touch before update on public.contact_messages
  for each row execute function public.touch_updated_at();

-- Row level security ------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.vehicles enable row level security;
alter table public.settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.ai_tokens enable row level security;

create policy "profiles: admins read all, users read self" on public.profiles
  for select to authenticated using (public.is_admin() or id = auth.uid());
create policy "profiles: admins update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- insert/delete go through api/admin-users (service role), which also
-- manages the auth.users row.

create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: staff write" on public.categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "vehicles: public read" on public.vehicles
  for select to anon, authenticated using (true);
create policy "vehicles: staff write" on public.vehicles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "settings: public read" on public.settings
  for select to anon, authenticated using (true);
create policy "settings: admin write" on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "contact_messages: anyone submits a new message" on public.contact_messages
  for insert to anon, authenticated with check (status = 'New');
create policy "contact_messages: staff read" on public.contact_messages
  for select to authenticated using (public.is_staff());
create policy "contact_messages: staff update" on public.contact_messages
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "contact_messages: admin delete" on public.contact_messages
  for delete to authenticated using (public.is_admin());

create policy "ai_tokens: owner or admin reads" on public.ai_tokens
  for select to authenticated using (public.is_admin() or (public.is_staff() and user_id = auth.uid()));
create policy "ai_tokens: staff create own" on public.ai_tokens
  for insert to authenticated with check (
    public.is_staff() and user_id = auth.uid()
    and last_used_at is null and last_client = ''
  );
create policy "ai_tokens: owner or admin revokes" on public.ai_tokens
  for delete to authenticated using (public.is_admin() or (public.is_staff() and user_id = auth.uid()));
-- No update policy: last_used_at/last_client are written by api/mcp (service role).

-- Column privileges: visitors may only fill the contact form fields, and
-- staff may only change a message's status.
revoke insert, update on public.contact_messages from anon, authenticated;
grant insert (name, email, phone, company, subject, message) on public.contact_messages to anon, authenticated;
grant update (status) on public.contact_messages to authenticated;
revoke update on public.ai_tokens from anon, authenticated;
revoke all on public.profiles from anon;
revoke all on public.ai_tokens from anon;

-- The helper functions are for policies; keep them off the public API.
revoke execute on function public.current_staff_role() from public, anon;
grant execute on function public.current_staff_role() to authenticated;

-- Live updates in the admin panel (RLS still applies to what each user sees).
alter publication supabase_realtime add table
  public.categories, public.vehicles, public.contact_messages, public.ai_tokens;
