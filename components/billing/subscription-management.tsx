"use client";

import type { PlanSlug, SubscriptionStatus } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ManageAction = "portal" | "cancel" | "resume";

function isScheduledCancelStatus(status?: SubscriptionStatus | null) {
  return status === "scheduled_cancel" || status === "scheduledcancel";
}

function formatDate(value?: string | null) {
  if (!value) return "the end of your billing period";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the end of your billing period";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPlan(plan: PlanSlug) {
  return plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : "Free";
}

export function SubscriptionManagement({
  plan,
  subscriptionStatus,
  currentPeriodEnd,
  hasSubscription,
}: {
  plan: PlanSlug;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(subscriptionStatus);
  const [periodEnd, setPeriodEnd] = useState(currentPeriodEnd);
  const [loading, setLoading] = useState<ManageAction | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scheduledCancel = isScheduledCancelStatus(status);
  const activeLike =
    status === "active" || status === "trialing" || status === "past_due";
  const statusLabel = scheduledCancel
    ? "Cancels at period end"
    : status
      ? status.replaceAll("_", " ")
      : "No active subscription";
  const canCancel = hasSubscription && activeLike;
  const canResume = hasSubscription && scheduledCancel;

  const summary = useMemo(() => {
    if (!hasSubscription || plan === "free") {
      return "You are currently on the Free plan.";
    }
    if (scheduledCancel) {
      return `Your ${formatPlan(plan)} plan remains active until ${formatDate(periodEnd)}.`;
    }
    return `Your ${formatPlan(plan)} plan is active.`;
  }, [hasSubscription, periodEnd, plan, scheduledCancel]);

  async function openPortal() {
    setLoading("portal");
    setError("");
    setNotice("");

    const response = await fetch("/api/billing/creem/portal", {
      method: "POST",
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.url) {
      setError(body?.error ?? "Could not open billing portal.");
      setLoading(null);
      return;
    }

    window.location.assign(body.url);
  }

  async function performSubscriptionAction(action: "cancel" | "resume") {
    setLoading(action);
    setError("");
    setNotice("");

    const response = await fetch(`/api/billing/creem/subscription/${action}`, {
      method: "POST",
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.error ?? `Could not ${action} subscription.`);
      setLoading(null);
      return;
    }

    setStatus(body?.subscriptionStatus ?? (action === "cancel" ? "scheduled_cancel" : "active"));
    setPeriodEnd(body?.currentPeriodEnd ?? periodEnd);
    setNotice(
      action === "cancel"
        ? "Your subscription is scheduled to cancel at the end of the billing period."
        : "Your subscription has been resumed.",
    );
    setConfirmOpen(false);
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/billing"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400"
          >
            <ArrowLeft className="size-4" />
            Billing
          </Link>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Manage subscription
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Review your current plan, update payment details, or change renewal
            status without leaving your workspace.
          </p>
        </div>
      </div>

      {(error || notice) && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          {error ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          <span className="flex-1">{error || notice}</span>
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
            className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Dismiss message"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-theme-primary">
                Current plan
              </p>
              <h2 className="mt-2 text-3xl font-black">{formatPlan(plan)}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {summary}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                scheduledCancel
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  : hasSubscription
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-6 grid gap-3 border-t border-zinc-200 pt-5 text-sm dark:border-zinc-800 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Renewal
              </p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {scheduledCancel
                  ? `Ends ${formatDate(periodEnd)}`
                  : hasSubscription
                    ? `Renews ${formatDate(periodEnd)}`
                    : "No renewal scheduled"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Billing provider
              </p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">Creem</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-bold">Subscription actions</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Secure changes powered by Creem.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={!hasSubscription || loading !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-theme-primary px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "portal" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              Update payment method
            </button>

            {canResume ? (
              <button
                type="button"
                onClick={() => void performSubscriptionAction("resume")}
                disabled={loading !== null}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              >
                {loading === "resume" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Resume subscription
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canCancel || loading !== null}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Cancel subscription?</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Your {formatPlan(plan)} access will remain available until{" "}
                  {formatDate(periodEnd)}. After that, your workspace will move
                  to the Free plan.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loading !== null}
                className="h-10 rounded-full border border-zinc-200 px-5 text-sm font-bold transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={() => void performSubscriptionAction("cancel")}
                disabled={loading !== null}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {loading === "cancel" && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Confirm cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
