# Backups — setup and restore test (E6)

Free-tier Supabase has no automatic backups or point-in-time recovery —
that's exactly why this exists. The workflow at
`.github/workflows/backup.yml` runs nightly, dumps the `public` schema
(students, fees, marks, payments, subjects, timetables, salaries,
tutorial_papers, profiles — the actual academic/financial records), and
keeps it as a downloadable Actions artifact for 30 days. It also runs on
demand via the "Run workflow" button on the Actions tab.

**Deliberately not included:** `auth.users` (login credentials) and
Storage bucket contents (payment screenshots, tutorial PDFs). Recovering
logins from total loss means re-running the admin bulk-import tool this
project already has, not restoring auth internals — mixing a school's own
data with Supabase's internal auth schema in one dump is more fragile than
it's worth for what this buys. If you want Storage contents backed up too
(the actual PDF/image files, not just the `tutorial_papers`/`payments`
rows that reference them), say so — it's a separate step using the
Supabase CLI or Storage API, not something `pg_dump` covers.

## 1. One-time setup (needs your Supabase access — I can't do this part)

1. Supabase dashboard → Project Settings → Database → Connection string →
   copy the **direct connection** URI (port 5432), not the pooler
   (port 6543) — `pg_dump` needs the direct connection.
2. GitHub repo → Settings → Secrets and variables → Actions → New
   repository secret → name it `SUPABASE_DB_URL`, paste the URI.
3. Actions tab → "Nightly Supabase backup" → "Run workflow" to fire one
   off immediately rather than waiting for 02:00 UTC.

## 2. Test restore (also needs a real target — I can't safely do this from here)

Never restore into the live project as a test. Use a scratch target:

1. Create a second, free Supabase project (or a local Postgres via
   `docker run -e POSTGRES_PASSWORD=test -p 5432:5432 postgres`).
2. Download a backup artifact from a completed workflow run (Actions tab
   → the run → Artifacts).
3. `gunzip -c school-db-<timestamp>.sql.gz | psql "<scratch-db-url>"`
4. Spot-check it actually worked:
   ```sql
   select count(*) from students;
   select count(*) from fees;
   select count(*) from payments;
   ```
   Compare against the same counts on the live project at the time the
   backup ran. If they match, the restore path is proven.
5. Tear down the scratch project/container — it did its job.

Do this once now (even with the school's current near-empty data) so the
mechanism is proven before there's real data at stake, and repeat it
periodically — a backup nobody has ever restored from is a theory, not a
backup.
