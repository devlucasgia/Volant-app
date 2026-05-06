-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles: owner can select" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles: owner can insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Profiles: owner can update" on public.profiles
  for update using (auth.uid() = id);
create policy "Profiles: owner can delete" on public.profiles
  for delete using (auth.uid() = id);

-- ENTRIES
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('earning','expense')),
  entry_date timestamptz not null,
  -- earning fields
  app text check (app in ('uber','99','indriver','particular')),
  km numeric,
  hours numeric,
  gross numeric,
  notes text,
  -- expense fields
  expense_category text check (expense_category in ('combustivel','alimentacao','manutencao','outros')),
  expense_amount numeric,
  expense_description text,
  maintenance_type text check (maintenance_type in ('oleo','bateria','pneus','outro')),
  created_at timestamptz not null default now()
);
create index entries_user_date_idx on public.entries (user_id, entry_date desc);
alter table public.entries enable row level security;

create policy "Entries: owner can select" on public.entries
  for select using (auth.uid() = user_id);
create policy "Entries: owner can insert" on public.entries
  for insert with check (auth.uid() = user_id);
create policy "Entries: owner can update" on public.entries
  for update using (auth.uid() = user_id);
create policy "Entries: owner can delete" on public.entries
  for delete using (auth.uid() = user_id);

-- USER SETTINGS
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal numeric not null default 250,
  maintenance_interval_km numeric not null default 10000,
  last_maintenance_km numeric not null default 0,
  theme text not null default 'dark' check (theme in ('light','dark')),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;

create policy "Settings: owner can select" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "Settings: owner can insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "Settings: owner can update" on public.user_settings
  for update using (auth.uid() = user_id);
create policy "Settings: owner can delete" on public.user_settings
  for delete using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.tg_set_updated_at();

-- Auto-create profile + settings on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();