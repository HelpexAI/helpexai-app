"use client";

import { ArrowLeft, Check, CreditCard, Loader2, Lock, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MockCheckoutForm({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function completePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/stripe/mock-complete", { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not complete mock payment.");
      setLoading(false);
      return;
    }
    router.push(body.url);
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 p-4 sm:p-8 lg:grid-cols-[1fr_420px] lg:items-start lg:p-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <Link href="/billing" className="mb-8 flex w-fit items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-[#2b7fff] dark:text-zinc-400">
          <ArrowLeft className="size-4" /> Back to billing
        </Link>
        <div className="mb-8">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">DEVELOPMENT MOCK PAYMENT</span>
          <h1 className="mt-4 text-2xl font-bold text-zinc-950 dark:text-white">Complete your upgrade</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Use any test card details. No real payment will be made.</p>
        </div>

        <form onSubmit={completePayment} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Email</span>
            <input value={email} disabled className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Name on card</span>
            <input required placeholder="John Doe" className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#2b7fff] dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Card information</span>
            <div className="overflow-hidden rounded-lg border border-zinc-200 focus-within:border-[#2b7fff] dark:border-zinc-700">
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input required inputMode="numeric" placeholder="4242 4242 4242 4242" className="h-11 w-full bg-white pl-10 pr-3 text-sm outline-none dark:bg-zinc-950" />
              </div>
              <div className="grid grid-cols-2 border-t border-zinc-200 dark:border-zinc-700">
                <input required placeholder="MM / YY" className="h-11 border-r border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950" />
                <input required inputMode="numeric" placeholder="CVC" className="h-11 bg-white px-3 text-sm outline-none dark:bg-zinc-950" />
              </div>
            </div>
          </label>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2b7fff] font-bold text-white transition hover:bg-blue-600 disabled:opacity-70">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {loading ? "Processing mock payment..." : "Subscribe for $49.00"}
          </button>
          <p className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"><ShieldCheck className="size-3.5" /> Mock checkout stores no card information.</p>
        </form>
      </section>

      <aside className="rounded-2xl bg-[#0a1628] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-[#2b7fff]"><Zap className="size-5" /></div><div><p className="font-bold">HelpexAI Pro</p><p className="text-xs text-white/50">Monthly subscription</p></div></div>
        <div className="my-8 border-y border-white/10 py-6"><div className="flex items-end justify-between"><span className="text-sm text-white/60">Due today</span><strong className="text-3xl">$49.00</strong></div><p className="mt-2 text-right text-xs text-white/40">Then $49.00 every month</p></div>
        <ul className="space-y-3 text-sm text-white/80">
          {["50 documents", "50 questions per day", "30 conversations", "Advanced citations", "Priority processing"].map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="size-4 text-blue-400" />{feature}</li>)}
        </ul>
        <p className="mt-8 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">Development mode only. Adding valid Stripe price IDs automatically replaces this page with Stripe Checkout.</p>
      </aside>
    </div>
  );
}

