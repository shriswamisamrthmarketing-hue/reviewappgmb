-- Smart Review Agent – add the customer-page settings column (QR review enhancement, 2026-11-21).
-- Run ONLY after approval: Supabase → SQL Editor → New query → paste → Run.
--
-- What it does: adds ONE new column, public.businesses.settings (jsonb, default '{}').
--   It stores per business: Instagram link, WhatsApp number, default page language,
--   number of review suggestions (3/5/7) and whether the experience topics are shown.
--
-- SAFETY
--  • Additive only: no DROP, DELETE, UPDATE or TRUNCATE. No existing row or value is changed.
--  • Existing businesses get '{}' = current behaviour (3 suggestions, phone language,
--    no Instagram/WhatsApp buttons, no topics) until someone saves new settings.
--  • "if not exists": safe to run more than once.
--  • All-or-nothing: runs inside one transaction.
--  • Permissions are unchanged (the app's server key already has select/update on businesses;
--    the public anon key still has none).

begin;

alter table public.businesses
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.businesses.settings is
  'Customer QR page settings: {instagram_url, whatsapp, language, suggestions, topics}. Edited from the dashboard.';

commit;

-- Check (read-only): should list the new column once.
-- select column_name, data_type, column_default from information_schema.columns
--  where table_schema = 'public' and table_name = 'businesses' and column_name = 'settings';
