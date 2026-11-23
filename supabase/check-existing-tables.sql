-- READ-ONLY compatibility check (step 1 of 3). It is ONE single SELECT statement:
-- it can only read, never change, add or delete anything.
-- Run in Supabase → SQL Editor → New query → paste → Run. One result table is shown.
-- The output contains table structure and counts only: no passwords, keys or personal data.
--
-- Sections (column "section"):
--   1 table          – which app tables/views exist, row counts, Row Level Security
--   2 column         – current columns of businesses and review_events
--   3 constraint     – primary keys, unique and check rules, foreign keys (with ON DELETE action)
--   4 references     – other tables that point to businesses (foreign keys)
--   5 index          – indexes on businesses and review_events
--   6 permission     – what anon / authenticated / service_role may do on each app table
--   7 trigger        – triggers on businesses and review_events (normally none)
--   8 compatibility  – data that the new setup rules would not accept (should all be 0)
--   9 backup         – whether the backup schema already exists

select * from (

  -- 1. existence, row count, RLS
  select 1 as step, 'table' as section, t.name as object,
         case when to_regclass('public.' || t.name) is null then 'MISSING'
              else (select case c.relkind when 'r' then 'table' when 'v' then 'view' else c.relkind::text end
                           || ' · rows: '
                           || coalesce((xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.name), false, true, '')))[1]::text, '?')
                           || case when c.relkind = 'r' then ' · row level security ' || case when c.relrowsecurity then 'ON' else 'OFF' end else '' end
                    from pg_class c where c.oid = to_regclass('public.' || t.name))
         end as detail
  from (values ('businesses'), ('review_events'), ('business_owners'), ('feedback'), ('review_replies'),
               ('business_stats'), ('keyword_stats')) as t(name)

  union all
  -- 2. columns
  select 2, 'column', (table_name || '.' || column_name)::text,
         (data_type || case when is_nullable = 'NO' then ' NOT NULL' else '' end
                    || coalesce(' DEFAULT ' || column_default, ''))::text
  from information_schema.columns
  where table_schema = 'public' and table_name in ('businesses', 'review_events')

  union all
  -- 3. constraints on the two existing tables (incl. foreign keys and their ON DELETE rule)
  select 3, 'constraint · ' || case contype when 'p' then 'primary key' when 'u' then 'unique' when 'c' then 'check'
                                            when 'f' then 'foreign key' else contype::text end,
         conrelid::regclass::text || ' · ' || conname,
         pg_get_constraintdef(oid) || case when not convalidated then '  (NOT VALID)' else '' end
  from pg_constraint
  where conrelid in (to_regclass('public.businesses'), to_regclass('public.review_events'))

  union all
  -- 4. any other table that points to businesses
  select 4, 'references businesses', conrelid::regclass::text || ' · ' || conname, pg_get_constraintdef(oid)
  from pg_constraint
  where contype = 'f' and confrelid = to_regclass('public.businesses')
    and conrelid is distinct from to_regclass('public.review_events')

  union all
  -- 5. indexes
  select 5, 'index', (tablename || ' · ' || indexname)::text, indexdef::text
  from pg_indexes
  where schemaname = 'public' and tablename in ('businesses', 'review_events')

  union all
  -- 6. permissions of the API roles
  select 6, 'permission', (table_name || ' · ' || grantee)::text, string_agg(privilege_type::text, ', ' order by privilege_type::text)
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('businesses', 'review_events', 'business_owners', 'feedback', 'review_replies', 'business_stats', 'keyword_stats')
    and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, grantee

  union all
  -- 7. triggers
  select 7, 'trigger', (event_object_table || ' · ' || trigger_name)::text, (action_timing || ' ' || event_manipulation)::text
  from information_schema.triggers
  where event_object_schema = 'public' and event_object_table in ('businesses', 'review_events')

  union all
  -- 8. compatibility with the new setup (all counts should be 0)
  select 8, 'compatibility', 'businesses: link names not in the allowed format',
         case when to_regclass('public.businesses') is null then 'table missing'
              else (xpath('/row/c/text()', query_to_xml(
                     $q$select count(*) as c from public.businesses
                        where not (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40)$q$, false, true, '')))[1]::text || ' (should be 0)' end
  union all
  select 8, 'compatibility', 'review_events: unknown activity types',
         case when to_regclass('public.review_events') is null then 'table missing'
              else (xpath('/row/c/text()', query_to_xml(
                     $q$select count(*) as c from public.review_events
                        where type not in ('visit', 'draft', 'regenerate', 'copy', 'google_open', 'request')$q$, false, true, '')))[1]::text || ' (should be 0)' end
  union all
  select 8, 'compatibility', 'review_events: rows whose business does not exist',
         case when to_regclass('public.review_events') is null or to_regclass('public.businesses') is null then 'table missing'
              else (xpath('/row/c/text()', query_to_xml(
                     $q$select count(*) as c from public.review_events e
                        where not exists (select 1 from public.businesses b where b.slug = e.business_slug)$q$, false, true, '')))[1]::text || ' (should be 0)' end

  union all
  -- 9. backup schema
  select 9, 'backup', 'backup_20261119',
         case when exists (select 1 from pg_namespace where nspname = 'backup_20261119')
              then 'exists (tables: ' || coalesce((select string_agg(relname, ', ' order by relname) from pg_class
                                                     where relnamespace = (select oid from pg_namespace where nspname = 'backup_20261119')
                                                       and relkind = 'r'), 'none') || ')'
              else 'not created yet' end

) as report
order by step, section, object;
