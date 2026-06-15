"use client";

import { createClient } from "@/lib/supabase/client";
import type { CurrentWorkspace } from "@/lib/dashboard/workspace";
import {
  AlertTriangle,
  Bell,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Palette,
  Save,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { themeStyle } from "@/lib/theme";
import type { ThemeOption } from "@/types";

type Tab = "profile" | "password" | "notifications" | "theme" | "delete";
type Preferences = {
  showCitations: boolean;
  documentReady: boolean;
  productUpdates: boolean;
  usageWarnings: boolean;
};

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-theme-primary" : "bg-zinc-200 dark:bg-zinc-700"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-2">
      <div>
        <p className="text-sm font-semibold text-zinc-950 dark:text-white">
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-zinc-950 dark:text-white">
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 pr-11 text-sm outline-none transition focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}

export function SettingsPanel({
  workspace,
  preferences: initialPreferences,
  themes,
}: {
  workspace: CurrentWorkspace;
  preferences: Preferences;
  themes: ThemeOption[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("profile");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(
    workspace.selectedThemeId,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const strength = Math.min(
    4,
    [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /\d/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
    ].filter(Boolean).length,
  );
  const selectedTheme =
    themes.find((theme) => theme.id === selectedThemeId) ?? null;
  const previewTheme = selectedTheme ?? workspace.product.theme;

  async function saveMetadata() {
    setLoading(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: name.trim(),
        show_citations: preferences.showCitations,
        document_ready_notifications: preferences.documentReady,
        product_update_notifications: preferences.productUpdates,
        usage_warning_notifications: preferences.usageWarnings,
      },
    });

    setLoading(false);

    if (updateError) return setError(updateError.message);

    setMessage("Settings saved.");
    router.refresh();
  }

  async function saveTheme() {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/workspace/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        themeId: selectedThemeId,
      }),
    });

    const body = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      return setError(body?.error ?? "Could not save theme.");
    }

    setMessage("Dashboard theme saved.");
    router.refresh();
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8)
      return setError("New password must be at least 8 characters.");

    if (newPassword !== confirmPassword)
      return setError("New passwords do not match.");

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: workspace.email,
      password: currentPassword,
    });

    if (authError) {
      setLoading(false);
      return setError("Current password is incorrect.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) return setError(updateError.message);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully.");
  }

  async function requestDeletion() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/account/delete-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirmation }),
    });

    const body = await response.json();

    if (!response.ok) {
      setLoading(false);
      return setError(body.error ?? "Could not request deletion.");
    }

    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    setError("");

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setSigningOut(false);
      setError(signOutError.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "password" as const, label: "Password", icon: Lock },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "theme" as const, label: "Theme", icon: Palette },
    {
      id: "delete" as const,
      label: "Delete Account",
      icon: AlertTriangle,
      danger: true,
    },
  ];

  const activeTab = tabs.find((item) => item.id === tab);

  return (
    <div
      className="relative flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-slate-50 dark:bg-zinc-950"
      style={themeStyle(previewTheme)}
    >
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close settings menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col gap-1 overflow-hidden border-r border-zinc-200 bg-white p-3 shadow-xl transition-transform dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="theme-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon, danger }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setError("");
                setMessage("");
                setMobileOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                tab === id
                  ? danger
                    ? "border-red-200 bg-red-50 font-semibold text-red-600 dark:border-red-900 dark:bg-red-950/30"
                    : "border-theme-border bg-theme-soft font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark"
                  : danger
                    ? "border-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    : "border-transparent text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="theme-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold shadow-sm dark:border-zinc-700 dark:bg-zinc-900 lg:hidden"
        >
          <Menu className="size-4 text-theme-primary" />
          {activeTab?.label ?? "Settings"}
        </button>

        <section className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          {message && (
            <p className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="size-4" />
              {message}
            </p>
          )}
          {error && (
            <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          {tab === "profile" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
                <div className="flex size-20 items-center justify-center rounded-full bg-theme-soft text-2xl font-bold text-theme-primary dark:bg-theme-soft-dark">
                  {workspace.initials}
                </div>
                <h2 className="text-xl font-bold">{name}</h2>
                <span className="rounded-full border border-theme-border bg-theme-soft px-3 py-1 text-xs font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark">
                  {workspace.product.name}
                </span>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Full Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold">Email</span>
                <input
                  value={workspace.email}
                  disabled
                  className="h-11 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100/60 px-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <span className="text-xs text-zinc-500">Cannot be changed</span>
              </label>
              <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
                <SettingRow
                  title="Show source citations"
                  description="Display document sources alongside AI responses"
                  checked={preferences.showCitations}
                  onChange={() =>
                    setPreferences((value) => ({
                      ...value,
                      showCitations: !value.showCitations,
                    }))
                  }
                />
                <SettingRow
                  title="AI Disclaimer"
                  description="Required - cannot be disabled"
                  checked
                  disabled
                />
              </div>
              <button
                onClick={() => void saveMetadata()}
                disabled={loading || !name.trim()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400 sm:hidden"
              >
                {signingOut ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                {signingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          )}

          {tab === "password" && (
            <form onSubmit={changePassword} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">Change Password</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Update your password to keep your account secure.
                </p>
              </div>
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
              />
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((value) => (
                  <span
                    key={value}
                    className={`h-1.5 flex-1 rounded-full ${value <= strength ? (strength >= 4 ? "bg-emerald-500" : "bg-amber-400") : "bg-zinc-200 dark:bg-zinc-700"}`}
                  />
                ))}
              </div>
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
              <button
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                Save Password
              </button>
            </form>
          )}

          {tab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">Notifications</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Choose which account emails you want to receive.
                </p>
              </div>
              <div className="space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                <SettingRow
                  title="Document ready"
                  description="Email me when document processing finishes"
                  checked={preferences.documentReady}
                  onChange={() =>
                    setPreferences((value) => ({
                      ...value,
                      documentReady: !value.documentReady,
                    }))
                  }
                />
                <SettingRow
                  title="Usage warnings"
                  description="Notify me when I approach plan limits"
                  checked={preferences.usageWarnings}
                  onChange={() =>
                    setPreferences((value) => ({
                      ...value,
                      usageWarnings: !value.usageWarnings,
                    }))
                  }
                />
                <SettingRow
                  title="Product updates"
                  description="Occasional news about new HelpexAI features"
                  checked={preferences.productUpdates}
                  onChange={() =>
                    setPreferences((value) => ({
                      ...value,
                      productUpdates: !value.productUpdates,
                    }))
                  }
                />
              </div>
              <button
                onClick={() => void saveMetadata()}
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Notifications
              </button>
            </div>
          )}

          {tab === "theme" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">Dashboard Theme</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Choose a dashboard look for this workspace. Preview changes
                  instantly here. Save to keep them, or leave without saving to
                  return to the current workspace default.
                </p>
              </div>

              <div className="rounded-2xl border border-theme-border bg-theme-soft p-4 text-sm text-theme-soft-foreground dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                <div className="flex items-start gap-3">
                  <Palette className="mt-0.5 size-5 shrink-0 text-theme-primary" />
                  <div>
                    <p className="font-semibold text-theme-primary">
                      Theme preview is live
                    </p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                      Select a card below to preview it on this settings page.
                      Nothing is saved until you click Save Theme.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSelectedThemeId(null)}
                  className={`overflow-hidden rounded-2xl border-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    selectedThemeId === null
                      ? "border-theme-primary shadow-md"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                  style={themeStyle(workspace.product.theme)}
                >
                  <div className="flex h-24 items-center justify-between px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-theme-primary">
                        Default
                      </p>
                      <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                        Workspace theme
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Reuse the product default.
                      </p>
                    </div>
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-theme-primary text-white">
                      {selectedThemeId === null ? <Check className="size-5" /> : <Palette className="size-5" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-0 border-t border-theme-border/70 dark:border-theme-border-dark/70">
                    <span className="h-12 bg-theme-primary" />
                    <span className="h-12 bg-theme-soft" />
                    <span className="h-12 bg-white dark:bg-zinc-950" />
                    <span className="h-12 bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </button>

                {themes.map((theme) => {
                  const selected = selectedThemeId === theme.id;
                  return (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => setSelectedThemeId(theme.id)}
                      className={`overflow-hidden rounded-2xl border-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        selected
                          ? "border-theme-primary shadow-md"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                      style={themeStyle(theme)}
                    >
                      <div className="flex h-24 items-center justify-between px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-theme-primary">
                            Theme
                          </p>
                          <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                            {theme.name}
                          </h3>
                          <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                            {theme.description}
                          </p>
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-theme-primary text-white">
                          {selected ? <Check className="size-5" /> : <Palette className="size-5" />}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-0 border-t border-theme-border/70 dark:border-theme-border-dark/70">
                        <span className="h-12 bg-theme-primary" />
                        <span className="h-12 bg-theme-soft" />
                        <span className="h-12 bg-white dark:bg-zinc-950" />
                        <span className="h-12 bg-zinc-100 dark:bg-zinc-800" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedThemeId(workspace.selectedThemeId)}
                  disabled={loading}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  Revert preview
                </button>
                <button
                  onClick={() => void saveTheme()}
                  disabled={loading || selectedThemeId === workspace.selectedThemeId}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Theme
                </button>
              </div>
            </div>
          )}

          {tab === "delete" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="size-5" />
                  <h2 className="font-bold">Delete Account</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  Your account will be frozen immediately and scheduled for
                  permanent deletion after 30 days. Any active subscription will
                  be cancelled.
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Type DELETE to confirm
                </span>
                <input
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-red-200 bg-white px-4 text-sm outline-none focus:border-red-500 dark:border-red-900 dark:bg-zinc-950"
                />
              </label>
              <button
                type="button"
                onClick={() => void requestDeletion()}
                disabled={loading || deleteConfirmation !== "DELETE"}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
                Request Account Deletion
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
