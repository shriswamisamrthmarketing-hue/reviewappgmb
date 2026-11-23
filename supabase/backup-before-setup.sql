-- BACKUP before setup (step 2 of 3). Run this BEFORE supabase/schema.sql.
-- Run in Supabase → SQL Editor → New query → paste → Run.
--
-- What it does
--  • Creates a separate area (schema) "backup_20261119" and copies every existing app table into it.
--  • Only READS the original tables: no original record is changed, moved or deleted.
--  • Never overwrites a backup: a table that is already in backup_20261119 is left exactly as it is.
--  • Verifies each new copy: the number of rows must equal the original, otherwise the whole backup
--    is cancelled (nothing is kept half-done) and an error message says which table failed.
--  • Nobody but the database owner can read the backup (not the website, not the public).
--  • It is its own package (BEGIN … COMMIT), so once it finishes, the backup stays even if the
--    later setup step fails.
-- The result table at the end shows, per table: original rows, backup rows and the status.

begin;

create schema if not exists backup_20261119;
revoke all on schema backup_20261119 from public, anon, authenticated;

do $$
declare
  t text;
  original_rows bigint;
  backup_rows bigint;
begin
  foreach t in array array['businesses', 'review_events', 'business_owners', 'feedback', 'review_replies'] loop
    if to_regclass('public.' || t) is null then
      raise notice '% – not in the database, nothing to back up', t;
    elsif to_regclass('backup_20261119.' || t) is not null then
      raise notice '% – a backup already exists, it is kept unchanged', t;
    else
      execute format('create table backup_20261119.%I as table public.%I', t, t);
      execute format('select count(*) from public.%I', t) into original_rows;
      execute format('select count(*) from backup_20261119.%I', t) into backup_rows;
      if original_rows <> backup_rows then
        raise exception 'Backup of % is incomplete (% original rows, % copied). Nothing was kept.', t, original_rows, backup_rows;
      end if;
      execute format('revoke all on backup_20261119.%I from public, anon, authenticated', t);
      execute format('comment on table backup_20261119.%I is %L', t, 'Backup of public.' || t || ' made ' || now()::text || ' before the schema setup');
      raise notice '% – backed up (% rows)', t, original_rows;
    end if;
  end loop;
end $$;

commit;

-- Verification report (read-only): compares every original table with its backup.
select t.name as "table",
       case when to_regclass('public.' || t.name) is null then null
            else (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.name), false, true, '')))[1]::text::bigint end
         as original_rows,
       case when to_regclass('backup_20261119.' || t.name) is null then null
            else (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from backup_20261119.%I', t.name), false, true, '')))[1]::text::bigint end
         as backup_rows,
       case when to_regclass('public.' || t.name) is null then 'no original table (nothing to back up)'
            when to_regclass('backup_20261119.' || t.name) is null then 'NOT BACKED UP – stop and report'
            when (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.name), false, true, '')))[1]::text
               = (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from backup_20261119.%I', t.name), false, true, '')))[1]::text
              then 'OK – backup matches'
            else 'DIFFERENT – the original changed since the backup was made (backup kept)' end
         as status
from (values ('businesses'), ('review_events'), ('business_owners'), ('feedback'), ('review_replies')) as t(name);
