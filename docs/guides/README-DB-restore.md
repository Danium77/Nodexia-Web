DB restore quick guide

This guide explains how to recreate the database schema for Nodexia-Web on Supabase and create an admin user.

1) Run the schema SQL
- Open your Supabase project > SQL editor > New query.
- Copy & paste `sql/init_schema.sql` content and run it. This will create tables, indexes, the `get_users_with_details` function and seed roles/profiles.

Notes:
- If your Supabase DB doesn't have the `pgcrypto` extension, replace `gen_random_uuid()` by `uuid_generate_v4()` and enable the extension: `create extension if not exists "uuid-ossp";` or `create extension if not exists pgcrypto;`.

2) Create an admin user (option A: script)
- Create a `.env` in the repository root with these variables:
  SUPABASE_URL=<your supabase url>
  SUPABASE_SERVICE_ROLE_KEY=<service role key>
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=StrongPassword123!
  ADMIN_FULL_NAME="Admin User"
  PROFILE_ID= (optional: uuid of the profile to use; if omitted a demo profile will be created)

- Install deps and run the script:

```bash
npm install @supabase/supabase-js dotenv
node scripts/create_admin.js
```

This will create (or reuse) an auth user, ensure the `admin` role exists, ensure a profile exists, insert a row to `profile_users` linking the new user as admin, and insert a row into `public.usuarios`.

3) Create an admin user (option B: manual)
- Use Supabase Auth UI to create a user with email/password.
- Copy the user UUID.
- Run `sql/seed_admin.sql` in the SQL editor and then run manual `INSERT` into `profile_users` as shown in that file.

4) Verify the app
- Start your Next.js app locally (`npm run dev`) and visit `/login`.
- Login with the admin user. The app will read from `profile_users` and redirect to `/admin/usuarios`.

If you want, puedo:
- Run these steps locally (no network access from here) — I can only provide commands and files.
- Add a small script to automate running the SQL using `psql` if you have direct DB connection details.

What do you want me to do next?
- Provide the `.env` example file (without secrets) and exact commands for PowerShell.
- Add a `package.json` script to run `create_admin.js`.
- Generate a `psql` script to run the SQL automatically.
