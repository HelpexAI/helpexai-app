"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { fetchJson, queryKeys } from "@/lib/client/query";
import type { CategorySlug, PlanSlug } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  FileSearch,
  Lock,
  Plus,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

type ReportTemplateSummary = {
  id: string;
  category_slug: CategorySlug;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  type: string;
  goal: string;
  required_sections: string[] | null;
  writing_style: Record<string, unknown> | null;
  min_plan: PlanSlug;
  sort_order: number;
};

type ReportTemplatesResponse = {
  templates: ReportTemplateSummary[];
  readyDocumentsCount: number;
  category: CategorySlug;
  plan: PlanSlug;
  locked: boolean;
  documentLimit: {
    used: number;
    limit: number;
    requiresResolution: boolean;
  };
};

const PLAN_RANK: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

function canUseTemplate(userPlan: PlanSlug, minPlan: PlanSlug) {
  return PLAN_RANK[userPlan] >= PLAN_RANK[minPlan];
}

function TemplateIcon({ slug }: { slug: string }) {
  if (slug.includes("risk")) return <ShieldAlert className="size-5" />;
  if (slug.includes("insight")) return <FileSearch className="size-5" />;
  if (slug.includes("executive")) {
    return <BriefcaseBusiness className="size-5" />;
  }

  return <BarChart3 className="size-5" />;
}

function TemplatesSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-96 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-56 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  plan,
  readyDocumentsCount,
  locked,
}: {
  template: ReportTemplateSummary;
  plan: PlanSlug;
  readyDocumentsCount: number;
  locked: boolean;
}) {
  const hasDocuments = readyDocumentsCount > 0;
  const allowedByPlan = canUseTemplate(plan, template.min_plan);
  const disabled = !hasDocuments || locked || !allowedByPlan;

  let href = `/reports/new?template=${template.id}`;
  let actionLabel = "Use template";

  if (!hasDocuments) {
    href = "/documents";
    actionLabel = "Upload documents first";
  } else if (locked) {
    href = "/billing";
    actionLabel = "Resolve document limit";
  } else if (!allowedByPlan) {
    href = "/billing";
    actionLabel = `Upgrade to ${template.min_plan}`;
  }

  return (
    <Link
      href={href}
      className="group flex min-h-56 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-theme-border hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-theme-border-dark"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
          <TemplateIcon slug={template.slug} />
        </div>

        {template.min_plan !== "free" && (
          <span className="rounded-full border border-theme-border bg-theme-soft px-2.5 py-1 text-[11px] font-bold uppercase text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark">
            {template.min_plan}
          </span>
        )}
      </div>

      <h3 className="mt-5 font-bold text-zinc-950 dark:text-white">
        {template.name}
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {template.description ?? template.goal}
      </p>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-theme-primary">
        {disabled ? (
          <>
            <Lock className="size-4" />
            {actionLabel}
          </>
        ) : (
          <>
            {actionLabel}
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </>
        )}
      </div>
    </Link>
  );
}

function CustomTemplateCard({
  readyDocumentsCount,
  locked,
}: {
  readyDocumentsCount: number;
  locked: boolean;
}) {
  const hasDocuments = readyDocumentsCount > 0;

  let href = "/reports/new?template=custom";
  let actionLabel = "Create custom report";
  let disabled = false;

  if (!hasDocuments) {
    href = "/documents";
    actionLabel = "Upload documents first";
    disabled = true;
  } else if (locked) {
    href = "/billing";
    actionLabel = "Resolve document limit";
    disabled = true;
  }

  return (
    <Link
      href={href}
      className="group flex min-h-56 flex-col rounded-2xl border border-dashed border-theme-border bg-theme-soft/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-theme-soft hover:shadow-md dark:border-theme-border-dark dark:bg-theme-soft-dark/30 dark:hover:bg-theme-soft-dark"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-theme-primary text-white">
        <Plus className="size-5" />
      </div>

      <h3 className="mt-5 font-bold text-zinc-950 dark:text-white">
        Custom report
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        Write your own prompt and let HelpexAI generate a custom report from
        selected documents or a full collection.
      </p>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-theme-primary">
        {disabled ? (
          <>
            <Lock className="size-4" />
            {actionLabel}
          </>
        ) : (
          <>
            {actionLabel}
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </>
        )}
      </div>
    </Link>
  );
}

export function ReportTemplatesClientPage() {
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.reportTemplates,
    queryFn: () => fetchJson<ReportTemplatesResponse>("/api/reports"),
  });

  if (error) {
    return (
      <ClientPageError message={error.message} onRetry={() => void refetch()} />
    );
  }

  if (!data) return <TemplatesSkeleton />;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400"
          >
            <ArrowLeft className="size-4" />
            Back to reports
          </Link>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
              <Plus className="size-5" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Choose report template
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Select a template to start generating a professional report from
            your knowledge base.
          </p>
        </div>
      </div>

      {data.readyDocumentsCount === 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Upload at least one ready document before creating a report.
        </section>
      )}

      {data.locked && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Your document limit needs resolution before creating reports.
        </section>
      )}

      {data.templates.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          {data.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              plan={data.plan}
              readyDocumentsCount={data.readyDocumentsCount}
              locked={data.locked}
            />
          ))}
          <CustomTemplateCard
            readyDocumentsCount={data.readyDocumentsCount}
            locked={data.locked}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          No active report templates were found. Check your report template
          migration or seed data.
        </section>
      )}
    </div>
  );
}
