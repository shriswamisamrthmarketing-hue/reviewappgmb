-- Smart Google Review Agent – Supabase schema setup (step 3 of 3).
-- Run order:  1) supabase/check-existing-tables.sql  (read-only)
--             2) supabase/backup-before-setup.sql   (makes the backup)
--             3) this file
-- Run in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again after updating the app (it only adds what is missing).
--
-- SAFETY
--  • Refuses to start unless the backup from step 2 exists for every existing app table.
--  • All-or-nothing: everything runs inside one transaction (BEGIN … COMMIT). If any line fails,
--    nothing at all is changed.
--  • No DROP TABLE, DROP VIEW, DELETE or TRUNCATE. Existing rows are never changed.
--  • The app's server key (service_role) gets only the permissions each feature needs (see the end).
--    The public (anon) key can read or write nothing.
--  • The app fills in the four original businesses automatically only if the businesses table is empty.

begin;

-- ---------------------------------------------------------------------------
-- 0. Safety guard: stop here if an existing app table has no backup yet (run backup-before-setup.sql first).
do $$
declare t text;
begin
  foreach t in array array['businesses', 'review_events', 'business_owners', 'feedback', 'review_replies'] loop
    if to_regclass('public.' || t) is not null and to_regclass('backup_20261119.' || t) is null then
      raise exception 'No backup of public.% found. Run supabase/backup-before-setup.sql first. Nothing was changed.', t;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Businesses (skipped if it already exists).
create table if not exists public.businesses (
  slug               text primary key
                     constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40),
  name               text not null,
  short_name         text,
  category           text,
  location           text,
  logo_url           text,
  primary_color      text default '#1F3A5F',
  accent_color       text default '#C9A227',
  google_review_url  text,          -- PUBLIC "write a review" link (g.page/r/.../review)
  gbp_manage_url     text,          -- management link, admin reference only
  seo_keywords       text,
  keywords           jsonb not null default '[]'::jsonb,  -- [{id, text, enabled, when:["question:option"]}]
  greeting           jsonb not null default '{}'::jsonb,
  questions          jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

-- 2. Activity log: anonymous counts only, no review text or personal data (skipped if it exists).
--    "on delete cascade": only when the admin deletes a whole business (typed confirmation in the
--    dashboard) are that business's own rows removed with it. Nothing is deleted by this script.
create table if not exists public.review_events (
  id             bigserial primary key,
  business_slug  text not null references public.businesses(slug) on delete cascade,
  type           text not null check (type in ('visit', 'draft', 'regenerate', 'copy', 'google_open', 'request')),
  rating         text,
  language       text,
  source         text,
  keyword        text,          -- SEO keyword the AI used in this draft (if any)
  created_at     timestamptz not null default now()
);

-- 3. Business-owner accounts. Passwords are stored as salted scrypt hashes, never in plain text.
create table if not exists public.business_owners (
  id               uuid primary key,
  email            text not null unique check (email = lower(email)),
  name             text not null,
  business_slug    text not null references public.businesses(slug) on delete cascade,
  password_hash    text not null,
  active           boolean not null default true,
  session_version  integer not null default 1,   -- bumped to sign the owner out everywhere
  created_at       timestamptz not null default now(),
  last_login_at    timestamptz
);
create index if not exists business_owners_slug_idx on public.business_owners (business_slug);
--   status: 'pending' (waiting for admin approval) | 'active' | 'rejected' | 'suspended'
--   source: 'admin' (created by the administrator) | 'signup' (registered on /signup)
alter table public.business_owners add column if not exists status text not null default 'active';
alter table public.business_owners add column if not exists source text not null default 'admin';
alter table public.business_owners add column if not exists phone text;
-- Password reset: only a SHA-256 hash of the one-time token is stored, with a 1-hour expiry.
alter table public.business_owners add column if not exists reset_token_hash text;
alter table public.business_owners add column if not exists reset_expires timestamptz;
alter table public.business_owners add column if not exists username text;
create unique index if not exists business_owners_username_idx on public.business_owners (username) where username is not null;
-- Allowed account statuses (adds 'rejected'). Only the rule is replaced; no row is changed.
-- NOT VALID = existing rows are not re-checked, so this can never fail because of old data.
alter table public.business_owners drop constraint if exists business_owners_status_check;
alter table public.business_owners add constraint business_owners_status_check
  check (status in ('pending', 'active', 'rejected', 'suspended')) not valid;

-- 4. Customer feedback from the review page (no name, phone or email is collected).
create table if not exists public.feedback (
  id               uuid primary key,
  business_slug    text not null references public.businesses(slug) on delete cascade,
  stars            smallint not null check (stars between 1 and 5),
  rating           text,
  highlights       jsonb not null default '[]'::jsonb,   -- [{question, values:[…]}] in English
  details          text,                                  -- customer's own optional words
  language         text,
  style            text,
  source           text,                                  -- qr | nfc | wa | sms | link
  drafts_source    text,                                  -- ai | fallback
  review_text      text,                                  -- final text the customer kept
  copied           boolean not null default false,
  google_clicked   boolean not null default false,
  written_manually boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists feedback_slug_created_idx on public.feedback (business_slug, created_at desc);
alter table public.feedback add column if not exists campaign text;          -- campaign QR tag (?c=…)

-- 5. Owner replies to Google reviews (AI-assisted). Must be approved by the owner before use.
create table if not exists public.review_replies (
  id             uuid primary key,
  business_slug  text not null references public.businesses(slug) on delete cascade,
  reviewer       text,
  stars          smallint,
  review_text    text,
  reply_text     text,
  language       text,
  source         text,
  status         text not null default 'draft' check (status in ('draft', 'approved', 'posted')),
  approved_at    timestamptz,
  approved_by    text,
  posted_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists review_replies_slug_idx on public.review_replies (business_slug, created_at desc);

-- 6. Columns added in later app versions (existing rows only get the default in the NEW column).
alter table public.businesses    add column if not exists keywords jsonb not null default '[]'::jsonb;
alter table public.businesses    add column if not exists created_at timestamptz not null default now();
-- Customer-page settings (Instagram, WhatsApp, language, suggestion count, topics). Same as add-business-settings.sql.
alter table public.businesses    add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.review_events add column if not exists keyword text;
alter table public.review_events add column if not exists campaign text;     -- campaign QR tag (?c=…)
-- Allowed activity types (adds 'request'). Only the rule is replaced (NOT VALID: old rows not re-checked).
alter table public.review_events drop constraint if exists review_events_type_check;
alter table public.review_events add constraint review_events_type_check
  check (type in ('visit', 'draft', 'regenerate', 'copy', 'google_open', 'request')) not valid;
-- Older versions only allowed the four original businesses; allow any well-formed link name now.
alter table public.businesses drop constraint if exists businesses_slug_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'businesses_slug_format') then
    alter table public.businesses add constraint businesses_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40) not valid;
  end if;
end $$;

create index if not exists review_events_slug_type_idx on public.review_events (business_slug, type);
create index if not exists review_events_created_idx on public.review_events (created_at);

-- 7. Dashboard statistics (calculations only; they store no data).
create or replace view public.business_stats
with (security_invoker = true) as
select
  business_slug,
  count(*) filter (where type = 'visit')                                   as visits,
  count(*) filter (where type = 'visit' and source in ('qr', 'nfc'))       as qr_scans,
  count(*) filter (where type = 'draft')                                   as drafts,
  count(*) filter (where type = 'draft' and source = 'ai')                 as ai_drafts,
  count(*) filter (where type = 'regenerate')                              as regenerations,
  count(*) filter (where type = 'copy')                                    as copies,
  count(*) filter (where type = 'google_open')                             as google_opens,
  count(*) filter (where type = 'visit' and created_at > now() - interval '7 days') as visits_7d,
  count(*) filter (where type = 'draft' and created_at > now() - interval '7 days') as drafts_7d,
  count(*) filter (where type = 'draft' and rating = 'excellent')          as r_excellent,
  count(*) filter (where type = 'draft' and rating = 'good')               as r_good,
  count(*) filter (where type = 'draft' and rating = 'average')            as r_average,
  count(*) filter (where type = 'draft' and rating = 'not_satisfied')      as r_not_satisfied,
  count(*) filter (where type = 'draft' and language = 'en')               as l_en,
  count(*) filter (where type = 'draft' and language = 'mr')               as l_mr,
  count(*) filter (where type = 'draft' and language = 'hi')               as l_hi,
  count(*) filter (where type = 'request')                                 as requests,
  count(*) filter (where type = 'visit' and source in ('wa', 'sms'))       as request_visits
from public.review_events
group by business_slug;

create or replace view public.keyword_stats
with (security_invoker = true) as
select business_slug, keyword, count(*) as uses
from public.review_events
where type in ('draft', 'regenerate') and keyword is not null
group by business_slug, keyword;

-- ---------------------------------------------------------------------------
-- 8. Security. Row Level Security ON with no policies + no permissions for the public keys:
--    anon / authenticated can read or write nothing.
alter table public.businesses      enable row level security;
alter table public.review_events   enable row level security;
alter table public.business_owners enable row level security;
alter table public.feedback        enable row level security;
alter table public.review_replies  enable row level security;
revoke all on public.businesses, public.review_events, public.business_owners, public.feedback,
              public.review_replies, public.business_stats, public.keyword_stats
  from anon, authenticated;

-- 9. The app's SERVER key (service_role): only what each feature uses.
--    DELETE is given only where the dashboards have a delete button:
--      businesses      – admin "Delete business" (must type the link name to confirm)
--      business_owners – admin "Delete owner"
--      review_replies  – owner deletes one of their own reply drafts
--    Feedback and the activity log can never be deleted or emptied by the app, and nothing can be TRUNCATEd.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.businesses      to service_role;
grant select, insert, update, delete on public.business_owners to service_role;
grant select, insert, update, delete on public.review_replies  to service_role;
grant select, insert, update         on public.feedback        to service_role;
grant select, insert                 on public.review_events   to service_role;
grant select on public.business_stats, public.keyword_stats    to service_role;
-- the activity log's ID counter (looked up by name, so it also works for tables created by older versions)
do $$ declare s text := pg_get_serial_sequence('public.review_events', 'id'); begin
  if s is not null then execute format('grant usage, select on sequence %s to service_role', s); end if;
end $$;
revoke delete, truncate on public.feedback       from service_role;
revoke update, delete, truncate on public.review_events from service_role;
revoke truncate on public.businesses, public.business_owners, public.review_replies from service_role;

commit;
