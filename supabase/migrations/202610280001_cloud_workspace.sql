create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  about text not null default '',
  website text not null default '',
  phone text not null default '',
  country text not null default '',
  photo text,
  updated_at timestamptz not null default now()
);

create table public.posts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  text text not null default '',
  platforms text[] not null default '{}',
  status text not null check (status in ('sent', 'scheduled', 'failed', 'draft')),
  created_at timestamptz not null default now(),
  scheduled_at timestamptz,
  image text,
  first_comment text,
  publish_results jsonb not null default '[]'::jsonb,
  primary key (user_id, id)
);

create table public.social_accounts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  platform text not null,
  name text not null default '',
  handle text not null default '',
  status text not null default 'working' check (status in ('working', 'paused')),
  connection_type text not null default 'local' check (connection_type in ('local', 'telegram')),
  external_id text,
  bot_username text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.automations (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('ai', 'website', 'pinterest', 'blogger')),
  name text not null default '',
  detail text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  platforms text[] not null default '{}',
  topic text,
  language text,
  source_url text,
  seen_ids jsonb not null default '[]'::jsonb,
  last_run_at timestamptz,
  ai_caption boolean,
  primary key (user_id, id)
);

create table public.notifications (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null default '',
  body text not null default '',
  time text not null default '',
  read boolean not null default false,
  type text not null default 'info' check (type in ('success', 'info', 'warning')),
  primary key (user_id, id)
);

create table public.social_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id text not null,
  encrypted_token text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id),
  foreign key (user_id, account_id) references public.social_accounts (user_id, id) on delete cascade
);

create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index social_accounts_user_platform_idx on public.social_accounts (user_id, platform);
create index automations_user_active_idx on public.automations (user_id, active);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.social_accounts enable row level security;
alter table public.automations enable row level security;
alter table public.notifications enable row level security;
alter table public.social_connections enable row level security;

create policy "profile owner" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "post owner" on public.posts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "account owner" on public.social_accounts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "automation owner" on public.automations for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notification owner" on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Bot credentials are available only to the server role. There are deliberately
-- no browser read/write policies for this table.
revoke all on public.social_connections from anon, authenticated;
