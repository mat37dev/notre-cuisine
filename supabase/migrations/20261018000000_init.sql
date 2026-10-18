-- Notre cuisine : tables de départ.
-- Toutes les tables ont la sécurité par ligne (RLS) activée et AUCUNE politique :
-- seule la clé « service role », utilisée par le serveur du site, peut lire ou écrire.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null check (status in ('published', 'pending')),
  author_id uuid references profiles (id) on delete set null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_status_idx on recipes (status, created_at desc);

create table invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  profile_id uuid not null references profiles (id) on delete cascade,
  label text not null,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  label text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table submissions (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index submissions_ip_idx on submissions (ip_hash, created_at);

alter table profiles enable row level security;
alter table recipes enable row level security;
alter table invites enable row level security;
alter table devices enable row level security;
alter table submissions enable row level security;

revoke all on all tables in schema public from anon, authenticated;
