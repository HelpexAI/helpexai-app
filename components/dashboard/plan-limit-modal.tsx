"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { formatPrice, PLAN_LIMITS } from "@/lib/plans/limits";
import type { Plan, PlanSlug } from "@/types";
import { Check, Lock, Zap } from "lucide-react";
import Link from "next/link";

const PLAN_ORDER: PlanSlug[] = ["free", "pro", "premium"];

function formatStorage(bytes: number) {
  if (bytes >= 1024 ** 3) return `${bytes / 1024 ** 3}GB`;
  return `${Math.round(bytes / 1024 ** 2)}MB`;
}

function formatLimit(value: number) {
  return value < 0 ? "Unlimited" : value.toLocaleString();
}

function planFallback(slug: PlanSlug): Plan {
  return {
    id: slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    slug,
    category_slug: "business",
    price_monthly: slug === "premium" ? 1999 : slug === "pro" ? 999 : 0,
    creem_product_id: null,
    ...PLAN_LIMITS[slug],
  };
}

function nextPlanSlug(currentPlan: PlanSlug): PlanSlug {
  const index = PLAN_ORDER.indexOf(currentPlan);
  return PLAN_ORDER[Math.min(index + 1, PLAN_ORDER.length - 1)] ?? "pro";
}

function planFeatures(plan: Plan) {
  return [
    `${formatStorage(plan.max_storage_bytes)} of storage`,
    `${formatLimit(plan.max_queries_day)} queries/day`,
    `${formatLimit(plan.max_reports_month)} reports/month`,
  ];
}

function formatUsedLimit(used: number, limit: number, resource: string) {
  if (resource === "storage" || limit >= 1024 ** 2) {
    return `${formatStorage(used)}/${formatStorage(limit)} ${resource} used`;
  }

  return `${used.toLocaleString()}/${limit.toLocaleString()} ${resource} used`;
}

export function PlanLimitModal({
  open,
  onClose,
  used,
  limit,
  resource = "documents",
  currentPlan = "free",
  plans = [],
}: {
  open: boolean;
  onClose: () => void;
  used: number;
  limit: number;
  resource?: string;
  currentPlan?: PlanSlug;
  plans?: Plan[];
}) {
  const targetSlug = nextPlanSlug(currentPlan);
  const targetPlan =
    plans.find((plan) => plan.slug === targetSlug) ?? planFallback(targetSlug);
  const features = planFeatures(targetPlan);

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      ariaLabel="Plan limit reached"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-theme-soft dark:bg-theme-soft-dark">
            <Lock className="size-10 text-theme-primary dark:text-theme-soft-foreground-dark" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              You&apos;ve reached your plan limit
            </h2>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-900 dark:bg-amber-950/40">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {formatUsedLimit(used, limit, resource)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            Upgrade to {targetPlan.name} to unlock:
          </p>
          <div className="space-y-1">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5"
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                  <Check className="size-3" />
                </div>
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-theme-primary">
            {formatPrice(targetPlan.price_monthly).replace("/mo", "")}
          </span>
          <span className="font-semibold text-zinc-950 dark:text-zinc-100">
            {targetPlan.price_monthly > 0 ? "/month" : ""}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            · cancel anytime
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/billing"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-theme-primary text-base font-semibold text-white transition hover:bg-theme-primary-hover"
          >
            <Zap className="size-4" />
            View Upgrade Options
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="py-1 text-center text-sm text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Maybe later
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
