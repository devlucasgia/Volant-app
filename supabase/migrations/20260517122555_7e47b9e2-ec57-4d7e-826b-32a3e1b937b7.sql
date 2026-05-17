-- Enable pg_net for HTTP calls from triggers
create extension if not exists pg_net with schema extensions;

-- Track which users we've already notified about (dedup)
create table if not exists public.signup_notifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.signup_notifications enable row level security;
-- No policies: only service role (edge function) writes here.

-- Trigger function: fires after a new user is created in auth.users
create or replace function public.notify_new_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url text := 'https://nlyodajhhmpupzuhinhs.supabase.co';
begin
  -- Fire-and-forget HTTP call to the edge function.
  perform extensions.http_post(
    url := project_url || '/functions/v1/notify-new-user',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('user_id', new.id::text)
  );
  return new;
exception when others then
  -- Never block signup if the notification call fails.
  raise warning 'notify_new_user_signup failed: %', sqlerrm;
  return new;
end;
$$;

-- pg_net exposes net.http_post; alias via extensions schema requires using net.* directly.
-- Replace function body to use net.http_post correctly.
create or replace function public.notify_new_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text := 'https://nlyodajhhmpupzuhinhs.supabase.co';
begin
  perform net.http_post(
    url := project_url || '/functions/v1/notify-new-user',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('user_id', new.id::text)
  );
  return new;
exception when others then
  raise warning 'notify_new_user_signup failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
after insert on auth.users
for each row execute function public.notify_new_user_signup();