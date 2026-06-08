import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { startOfTodayUtc } from "@/lib/usage/daily";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/stripe/plans";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  FileText,
  HelpCircle,
  MessageSquare,
  Scale,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

function UsageCard({
  label,
  current,
  limit,
  icon: Icon,
  warning,
}: {
  label: string;
  current: number;
  limit: number;
  icon: LucideIcon;
  warning?: boolean;
}) {
  const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:text-sm">
          {label}
        </span>
        <div
          className={`flex size-8 items-center justify-center rounded-lg ${
            warning
              ? "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
              : "bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark"
          }`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold leading-9 text-zinc-950 dark:text-white">
          {current}
        </span>
        <span className="mb-0.5 text-lg font-medium text-zinc-500 dark:text-zinc-400">
          /{limit}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Usage</span>
          <span
            className={`font-semibold ${
              warning ? "text-amber-600 dark:text-amber-400" : "text-theme-primary"
            }`}
          >
            {percentage}%
          </span>
        </div>
        <div
          className={`h-1.5 overflow-hidden rounded-full ${
            warning ? "bg-amber-100 dark:bg-amber-950/50" : "bg-theme-soft dark:bg-theme-soft-dark"
          }`}
        >
          <div
            className={`h-full rounded-full ${
              warning ? "bg-amber-500" : "bg-theme-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function CountCard({
  label,
  current,
  icon: Icon,
}: {
  label: string;
  current: number;
  icon: LucideIcon;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:text-sm">
          {label}
        </span>
        <div className="flex size-8 items-center justify-center rounded-lg bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
          <Icon className="size-4" />
        </div>
      </div>
      <span className="text-3xl font-bold leading-9 text-zinc-950 dark:text-white">
        {current}
      </span>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Unlimited conversations
      </p>
    </article>
  );
}

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const [questionsResult, conversationsCountResult, recentResult] = await Promise.all([
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspace.userId)
      .eq("category_slug", workspace.category)
      .eq("action", "query")
      .gte("created_at", startOfTodayUtc()),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspace.userId)
      .eq("category_slug", workspace.category),
    supabase
      .from("conversations")
      .select("id, title, selected_document_ids, created_at")
      .eq("user_id", workspace.userId)
      .eq("category_slug", workspace.category)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const limits = PLAN_LIMITS[workspace.plan];
  const documentsCount = workspace.documentsUsed;
  const questionsCount = questionsResult.count ?? 0;
  const conversationsCount = conversationsCountResult.count ?? 0;
  const recentConversations = recentResult.data ?? [];
  const business = workspace.category === "business";
  const CategoryIcon = business ? Briefcase : Scale;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <section className="space-y-1">
        <h2 className="text-2xl font-bold leading-8 text-zinc-950 dark:text-white">
          Welcome back, {workspace.name}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Here&apos;s what&apos;s happening with your workspace today.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UsageCard
          label="Documents"
          current={documentsCount}
          limit={limits.max_documents}
          icon={FileText}
          warning={documentsCount >= limits.max_documents}
        />
        <UsageCard
          label="Questions Today"
          current={questionsCount}
          limit={limits.max_queries_day}
          icon={HelpCircle}
        />
        <CountCard
          label="Conversations"
          current={conversationsCount}
          icon={MessageSquare}
        />
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
            <CategoryIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-zinc-950 dark:text-white">
                Helpex {business ? "Business" : "Legal"}
              </h3>
              <span className="rounded-full border border-theme-border bg-theme-soft px-2 py-0.5 text-xs font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                Active
              </span>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {business
                ? "Analyze business documents, compare contracts and invoices, and uncover costly discrepancies."
                : "Analyze legal documents, understand clauses and obligations, and receive clear cited insights."}
            </p>
          </div>
        </div>
        <Link
          href="/conversations"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white transition hover:bg-theme-primary-hover"
        >
          <MessageSquare className="size-4" />
          Go to Conversations
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-950 dark:text-white">
            Recent Conversations
          </h3>
          <Link
            href="/conversations"
            className="flex items-center gap-1 text-sm font-semibold text-theme-primary"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {recentConversations.length > 0 ? (
            recentConversations.map((conversation, index) => (
              <Link
                key={conversation.id}
                href={`/conversations/${conversation.id}`}
                className={`flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/70 sm:px-6 ${
                  index < recentConversations.length - 1
                    ? "border-b border-zinc-200 dark:border-zinc-800"
                    : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                      {conversation.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {conversation.selected_document_ids.length} document
                      {conversation.selected_document_ids.length === 1 ? "" : "s"} selected
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                    {formatConversationDate(conversation.created_at)}
                  </span>
                  <ChevronRight className="size-4 text-zinc-400" />
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center px-5 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                <MessageSquare className="size-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-950 dark:text-white">
                No conversations yet
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Upload a document and start your first AI conversation.
              </p>
              <Link
                href="/conversations"
                className="mt-5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Start Conversation
              </Link>
            </div>
          )}
        </div>
      </section>

      {workspace.plan === "free" && (
        <section className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-950 dark:text-white">
                You&apos;re on the Free plan
              </p>
              <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Upgrade to Pro for 30 documents and 30 daily questions.
              </p>
            </div>
          </div>
          <Link
            href="/billing"
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            <Zap className="size-4" />
            Upgrade to Pro
          </Link>
        </section>
      )}
    </div>
  );
}
