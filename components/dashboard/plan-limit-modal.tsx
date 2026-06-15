"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { Check, Lock, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  "2GB of storage",
  "Unlimited queries/day",
  "100 reports/month",
];

export function PlanLimitModal({
  open,
  onClose,
  used,
  limit,
  resource = "documents",
}: {
  open: boolean;
  onClose: () => void;
  used: number;
  limit: number;
  resource?: string;
}) {
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
                {used}/{limit} {resource} used
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            Upgrade your plan to unlock:
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
          <span className="text-3xl font-bold text-theme-primary">$29</span>
          <span className="font-semibold text-zinc-950 dark:text-zinc-100">
            /month and up
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
