"use client";

import type { Plan, PlanSlug, SubscriptionStatus } from "@/types";
import {
  Check,
  CreditCard,
  Download,
  Loader2,
  Settings2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

type Usage = {
  label: string;
  current: number;
  limit: number;
  format?: "bytes";
};

function formatUsage(value: number, format?: "bytes") {
  if (format !== "bytes") return value.toLocaleString();
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  return `${(value / 1024 ** 2).toFixed(value ? 1 : 0)} MB`;
}

function formatUsagePair(current: number, limit: number, format?: "bytes") {
  if (format !== "bytes") {
    return `${formatUsage(current, format)}/${formatUsage(limit, format)}`;
  }

  const currentFormatted = formatUsage(current, format);
  const limitFormatted = formatUsage(limit, format);
  const currentMatch = currentFormatted.match(/^(.+)\s([A-Z]+)$/);
  const limitMatch = limitFormatted.match(/^(.+)\s([A-Z]+)$/);

  if (currentMatch?.[2] && currentMatch[2] === limitMatch?.[2]) {
    return `${currentMatch[1]}/${limitMatch[1]} ${currentMatch[2]}`;
  }

  return `${currentFormatted}/${limitFormatted}`;
}

type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: string;
  url: string | null;
};

const CHECKOUT_PATH = "/api/billing/creem/checkout";
const PORTAL_PATH = "/api/billing/creem/portal";

type ToastTone = "success" | "warning" | "error";

function isScheduledCancelStatus(status?: SubscriptionStatus | null) {
  return status === "scheduled_cancel" || status === "scheduledcancel";
}

function BillingToast({
  tone,
  message,
  onClose,
}: {
  tone: ToastTone;
  message: string;
  onClose: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200";

  return (
    <div
      role="status"
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toneClass}`}
    >
      <span className="flex-1 leading-5">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        aria-label="Dismiss notification"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function PlanFeature({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const Icon = enabled ? Check : X;

  return (
    <li
      className={`flex items-center gap-2 text-sm ${
        enabled ? "" : "text-zinc-400"
      }`}
    >
      <Icon
        className={`size-4 shrink-0 ${
          enabled ? "text-emerald-500" : "text-zinc-400"
        }`}
      />
      {children}
    </li>
  );
}

function UsageRow({ label, current, limit, format }: Usage) {
  const unlimited = limit < 0;
  const percent = unlimited
    ? 0
    : limit
      ? Math.min(100, Math.round((current / limit) * 100))
      : 0;

  const warning = percent >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <span
          className={`text-xs font-semibold ${
            warning ? "text-amber-600" : "text-theme-primary"
          }`}
        >
          {unlimited ? "Unlimited" : `${percent}%`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${
              warning ? "bg-amber-400" : "bg-theme-primary"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <span className="min-w-20 whitespace-nowrap text-right text-xs text-zinc-500 dark:text-zinc-400">
          {unlimited ? `${formatUsage(current, format)}/∞` : formatUsagePair(current, limit, format)}
        </span>
      </div>
    </div>
  );
}

export function BillingOverview({
  plan,
  usage,
  invoices,
  notice,
  subscriptionStatus,
  plans,
}: {
  plan: PlanSlug;
  usage: Usage[];
  invoices: Invoice[];
  notice?: "success" | "cancelled";
  subscriptionStatus: SubscriptionStatus | null;
  plans: Plan[];
}) {
  const [loading, setLoading] = useState<"pro" | "premium" | "portal" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [dismissedNotice, setDismissedNotice] = useState<
    "success" | "cancelled" | null
  >(null);
  const [dismissedPastDue, setDismissedPastDue] = useState(false);

  useEffect(() => {
    setDismissedNotice(null);
  }, [notice]);

  useEffect(() => {
    setDismissedPastDue(false);
  }, [subscriptionStatus]);

  const planConfig = (slug: PlanSlug) =>
    plans.find((item) => item.slug === slug);

  const free = planConfig("free");
  const pro = planConfig("pro");
  const premium = planConfig("premium");
  const isScheduledCancel = isScheduledCancelStatus(subscriptionStatus);
  const noticeToast =
    notice && dismissedNotice !== notice
      ? {
          tone: notice === "success" ? "success" : "warning",
          message:
            notice === "success"
              ? "Payment completed. Your subscription is updated."
              : "Checkout was cancelled. No payment was made.",
        }
      : null;
  const pastDueToast =
    subscriptionStatus === "past_due" && !dismissedPastDue
      ? {
          tone: "error" as const,
          message:
            "Your payment is past due. Update your payment method to restore your paid plan.",
        }
      : null;

  async function openCreem(action: "pro" | "premium" | "portal") {
    setLoading(action);
    setError("");

    const isPortal = action === "portal";

    const response = await fetch(isPortal ? PORTAL_PATH : CHECKOUT_PATH, {
      method: "POST",
      headers: isPortal ? undefined : { "Content-Type": "application/json" },
      body: isPortal ? undefined : JSON.stringify({ plan_slug: action }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.url) {
      setError(body?.error ?? "Could not open Creem.");
      setLoading(null);
      return;
    }

    window.location.assign(body.url);
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {(noticeToast || error || pastDueToast) && (
        <div className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
          {noticeToast && (
            <BillingToast
              tone={noticeToast.tone as ToastTone}
              message={noticeToast.message}
              onClose={() => setDismissedNotice(notice ?? null)}
            />
          )}
          {error && (
            <BillingToast
              tone="error"
              message={error}
              onClose={() => setError("")}
            />
          )}
          {pastDueToast && (
            <BillingToast
              tone={pastDueToast.tone}
              message={pastDueToast.message}
              onClose={() => setDismissedPastDue(true)}
            />
          )}
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        <article
          className={`flex flex-col gap-5 rounded-2xl border-2 bg-white p-6 shadow-sm dark:bg-zinc-900 ${
            plan === "free"
              ? "border-theme-primary"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Free</h2>

            {plan === "free" && (
              <span className="rounded-full bg-theme-soft px-3 py-1 text-xs font-semibold text-theme-soft-foreground dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                CURRENT PLAN
              </span>
            )}
          </div>

          <div>
            <strong className="text-4xl font-black">
              ${(free?.price_monthly ?? 0) / 100}
            </strong>
            <span className="ml-1 text-sm text-zinc-500">/month</span>
          </div>

          <ul className="flex flex-1 flex-col gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <PlanFeature enabled>
              {formatUsage(free?.max_storage_bytes ?? 30 * 1024 ** 2, "bytes")}{" "}
              storage
            </PlanFeature>
            <PlanFeature enabled>
              {free?.max_queries_day ?? 100} queries/day
            </PlanFeature>
            <PlanFeature enabled>
              {free?.max_reports_month ?? 5} reports/month
            </PlanFeature>
            <PlanFeature enabled={false}>Priority processing</PlanFeature>
          </ul>

          <button
            disabled
            className="h-11 rounded-full bg-zinc-100 text-sm font-semibold text-zinc-400 dark:bg-zinc-800"
          >
            {plan === "free" ? "Current Plan" : "Free Plan"}
          </button>
        </article>

        <article
          className={`flex flex-col gap-5 rounded-2xl border-2 bg-theme-primary p-6 text-white shadow-lg ${
            plan === "pro" ? "border-white" : "border-transparent"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Pro</h2>

            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              {plan === "pro" ? "CURRENT PLAN" : "MOST POPULAR"}
            </span>
          </div>

          <div>
            <strong className="text-4xl font-black">
              ${(pro?.price_monthly ?? 2900) / 100}
            </strong>
            <span className="ml-1 text-sm text-white/80">/month</span>
          </div>

          <ul className="flex flex-1 flex-col gap-2 border-t border-white/20 pt-5 text-white [&_svg]:text-white">
            <PlanFeature enabled>
              {formatUsage(pro?.max_storage_bytes ?? 500 * 1024 ** 2, "bytes")}{" "}
              storage
            </PlanFeature>
            <PlanFeature enabled>
              {pro?.max_queries_day ?? 500} queries/day
            </PlanFeature>
            <PlanFeature enabled>
              {pro?.max_reports_month ?? 30} reports/month
            </PlanFeature>
            <PlanFeature enabled>Advanced citations</PlanFeature>
            <PlanFeature enabled>Priority processing</PlanFeature>
            <PlanFeature enabled>Cancel anytime</PlanFeature>
          </ul>

          {plan === "pro" ? (
            <button
              onClick={() => void openCreem("portal")}
              disabled={loading !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-white font-semibold text-theme-primary disabled:opacity-70"
            >
              {loading === "portal" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Settings2 className="size-4" />
              )}{" "}
              Manage Subscription
            </button>
          ) : (
            <button
              onClick={() => void openCreem("pro")}
              disabled={loading !== null || (plan === "premium" && !isScheduledCancel)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-theme-primary disabled:opacity-70"
            >
              {loading === "pro" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}{" "}
              {plan === "premium"
                ? isScheduledCancel
                  ? "Switch to Pro"
                  : "Included in Premium"
                : "Upgrade to Pro"}
            </button>
          )}
        </article>

        <article
          className={`flex flex-col gap-5 rounded-2xl border-2 bg-white p-6 shadow-sm dark:bg-zinc-900 ${
            plan === "premium"
              ? "border-theme-primary"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Premium</h2>

            <span className="rounded-full bg-theme-soft px-3 py-1 text-xs font-semibold text-theme-soft-foreground dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
              {plan === "premium" ? "CURRENT PLAN" : "MAXIMUM POWER"}
            </span>
          </div>

          <div>
            <strong className="text-4xl font-black">
              ${(premium?.price_monthly ?? 4900) / 100}
            </strong>
            <span className="ml-1 text-sm text-zinc-500">/month</span>
          </div>

          <ul className="flex flex-1 flex-col gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <PlanFeature enabled>
              {formatUsage(
                premium?.max_storage_bytes ?? 2 * 1024 ** 3,
                "bytes",
              )}{" "}
              storage
            </PlanFeature>
            <PlanFeature enabled>Unlimited queries/day</PlanFeature>
            <PlanFeature enabled>
              {premium?.max_reports_month ?? 100} reports/month
            </PlanFeature>
            <PlanFeature enabled>Advanced citations</PlanFeature>
            <PlanFeature enabled>Priority processing</PlanFeature>
            <PlanFeature enabled>Cancel anytime</PlanFeature>
          </ul>

          {plan === "premium" ? (
            <button
              onClick={() => void openCreem("portal")}
              disabled={loading !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-theme-primary font-semibold text-white disabled:opacity-70"
            >
              {loading === "portal" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Settings2 className="size-4" />
              )}{" "}
              Manage Subscription
            </button>
          ) : (
            <button
              onClick={() => void openCreem("premium")}
              disabled={loading !== null}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-theme-primary font-semibold text-white disabled:opacity-70"
            >
              {loading === "premium" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}{" "}
              Upgrade to Premium
            </button>
          )}
        </article>
      </section>

      <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div>
          <h2 className="font-bold">Current Usage</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Questions reset daily. Plan limits update after payment.
          </p>
        </div>

        {usage.map((item) => (
          <UsageRow key={item.label} {...item} />
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <CreditCard className="size-4 text-theme-primary" />
          <h2 className="font-bold">Invoice History</h2>
        </div>

        {invoices.length ? (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="grid gap-2 border-b border-zinc-200 px-5 py-4 text-sm last:border-0 dark:border-zinc-800 sm:grid-cols-[1fr_1.4fr_1fr_1fr_auto] sm:items-center"
            >
              <span>{invoice.date}</span>
              <span>HelpexAI Monthly Plan</span>
              <strong>{invoice.amount}</strong>
              <span className="capitalize text-emerald-600">
                {invoice.status}
              </span>

              {invoice.url ? (
                <a
                  href={invoice.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-semibold text-theme-primary"
                >
                  <Download className="size-3.5" /> Download
                </a>
              ) : (
                <span />
              )}
            </div>
          ))
        ) : (
          <div className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No invoices yet. Your helpex payment history will appear here after
            upgrading.
          </div>
        )}
      </section>
    </div>
  );
}
