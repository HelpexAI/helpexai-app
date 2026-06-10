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
  Save,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Tab = "profile" | "password" | "notifications" | "delete";
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
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
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
      <div><p className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</p><p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p></div>
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
      <span className="text-sm font-semibold text-zinc-950 dark:text-white">{label}</span>
      <div className="relative">
        <input type={visible ? "text" : "password"} required value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 pr-11 text-sm outline-none transition focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950" />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
      </div>
    </label>
  );
}

export function SettingsPanel({
  workspace,
  preferences: initialPreferences,
}: {
  workspace: CurrentWorkspace;
  preferences: Preferences;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(workspace.name);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const strength = Math.min(4, [newPassword.length >= 8, /[A-Z]/.test(newPassword), /\d/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length);

  async function saveMetadata() {
    setLoading(true); setError(""); setMessage("");
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

  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: workspace.email, password: currentPassword });
    if (authError) { setLoading(false); return setError("Current password is incorrect."); }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setMessage("Password updated successfully.");
  }

  async function requestDeletion() {
    setLoading(true); setError("");
    const response = await fetch("/api/account/delete-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: deleteConfirmation }) });
    const body = await response.json();
    if (!response.ok) { setLoading(false); return setError(body.error ?? "Could not request deletion."); }
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
    { id: "delete" as const, label: "Delete Account", icon: AlertTriangle, danger: true },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:w-52 lg:flex-col lg:p-0">
          {tabs.map(({ id, label, icon: Icon, danger }) => (
            <button key={id} type="button" onClick={() => { setTab(id); setError(""); setMessage(""); }} className={`flex shrink-0 items-center gap-3 border-b-2 px-4 py-3 text-sm transition lg:border-b-0 lg:border-l-4 ${tab === id ? danger ? "border-red-500 bg-red-50 font-semibold text-red-600 dark:bg-red-950/30" : "border-theme-primary bg-theme-soft font-semibold text-theme-primary dark:bg-theme-soft-dark" : danger ? "border-transparent text-red-500" : "border-transparent text-zinc-500 dark:text-zinc-400"}`}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </nav>

        <section className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          {message && <p className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><Check className="size-4" />{message}</p>}
          {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

          {tab === "profile" && <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800"><div className="flex size-20 items-center justify-center rounded-full bg-theme-soft text-2xl font-bold text-theme-primary dark:bg-theme-soft-dark">{workspace.initials}</div><h2 className="text-xl font-bold">{name}</h2><span className="rounded-full border border-theme-border bg-theme-soft px-3 py-1 text-xs font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark">{workspace.product.name}</span></div>
            <label className="block space-y-2"><span className="text-sm font-semibold">Full Name</span><input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <label className="block space-y-1"><span className="text-sm font-semibold">Email</span><input value={workspace.email} disabled className="h-11 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100/60 px-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800" /><span className="text-xs text-zinc-500">Cannot be changed</span></label>
            <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800"><SettingRow title="Show source citations" description="Display document sources alongside AI responses" checked={preferences.showCitations} onChange={() => setPreferences((value) => ({ ...value, showCitations: !value.showCitations }))} /><SettingRow title="AI Disclaimer" description="Required - cannot be disabled" checked disabled /></div>
            <button onClick={() => void saveMetadata()} disabled={loading || !name.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save Changes</button>
            <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400 sm:hidden">{signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}{signingOut ? "Logging out..." : "Log out"}</button>
          </div>}

          {tab === "password" && <form onSubmit={changePassword} className="space-y-6"><div><h2 className="text-lg font-bold">Change Password</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Update your password to keep your account secure.</p></div><PasswordInput label="Current Password" value={currentPassword} onChange={setCurrentPassword} /><PasswordInput label="New Password" value={newPassword} onChange={setNewPassword} /><div className="flex gap-1">{[1,2,3,4].map((value) => <span key={value} className={`h-1.5 flex-1 rounded-full ${value <= strength ? strength >= 4 ? "bg-emerald-500" : "bg-amber-400" : "bg-zinc-200 dark:bg-zinc-700"}`} />)}</div><PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} /><button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}Save Password</button></form>}

          {tab === "notifications" && <div className="space-y-6"><div><h2 className="text-lg font-bold">Notifications</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose which account emails you want to receive.</p></div><div className="space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800"><SettingRow title="Document ready" description="Email me when document processing finishes" checked={preferences.documentReady} onChange={() => setPreferences((value) => ({ ...value, documentReady: !value.documentReady }))} /><SettingRow title="Usage warnings" description="Notify me when I approach plan limits" checked={preferences.usageWarnings} onChange={() => setPreferences((value) => ({ ...value, usageWarnings: !value.usageWarnings }))} /><SettingRow title="Product updates" description="Occasional news about new HelpexAI features" checked={preferences.productUpdates} onChange={() => setPreferences((value) => ({ ...value, productUpdates: !value.productUpdates }))} /></div><button onClick={() => void saveMetadata()} disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save Notifications</button></div>}

          {tab === "delete" && <div className="space-y-6"><div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30"><div className="flex items-center gap-2 text-red-600"><AlertTriangle className="size-5" /><h2 className="font-bold">Delete Account</h2></div><p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">Your account will be frozen immediately and scheduled for permanent deletion after 30 days. Any active subscription will be cancelled.</p></div><label className="block space-y-2"><span className="text-sm font-semibold">Type DELETE to confirm</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="h-11 w-full rounded-lg border border-red-200 bg-white px-4 text-sm outline-none focus:border-red-500 dark:border-red-900 dark:bg-zinc-950" /></label><button type="button" onClick={() => void requestDeletion()} disabled={loading || deleteConfirmation !== "DELETE"} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}Request Account Deletion</button></div>}
        </section>
      </div>
    </div>
  );
}
