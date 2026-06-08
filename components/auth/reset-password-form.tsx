"use client";

import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div><h1 className="text-3xl font-bold tracking-tight">Set a new password</h1><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Choose a secure password for your HelpexAI account.</p></div>
      <label className="block space-y-2"><span className="text-sm font-semibold">New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-900" /></label>
      <label className="block space-y-2"><span className="text-sm font-semibold">Confirm password</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-900" /></label>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" />}Update Password</button>
    </form>
  );
}
