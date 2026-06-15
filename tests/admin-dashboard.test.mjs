import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/018_admin_dashboard.sql", import.meta.url), "utf8");
const auth = await readFile(new URL("../lib/admin/auth.ts", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
const actions = await readFile(new URL("../app/admin/settings/actions.ts", import.meta.url), "utf8");
const login = await readFile(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8");
const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");

test("admin dashboard uses explicit server-side platform authorization", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS platform_admins/);
  assert.match(migration, /REVOKE ALL ON platform_admins, system_events FROM anon, authenticated/);
  assert.match(auth, /supabase\.auth\.getUser\(\)/);
  assert.match(auth, /\.from\("platform_admins"\)/);
  assert.match(layout, /requireAdminUser\(\)/);
});

test("admin taxonomy writes are guarded and archive instead of hard delete", () => {
  assert.match(actions, /requireAdminAction\(\)/);
  assert.match(actions, /is_active: false/);
  assert.doesNotMatch(actions, /\.delete\(\)/);
});

test("admin authentication preserves the admin destination without redirect loops", () => {
  assert.match(auth, /redirect\("\/login\?next=\/admin"\)/);
  assert.match(auth, /admin=unauthorized/);
  assert.match(auth, /admin=setup-required/);
  assert.match(login, /router\.push\(safeNext\)/);
  assert.match(middleware, /safeInternalPath/);
});
