import { createServiceClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;
type DbRow = Record<string, unknown>;
type CountFilter = { column: string; value: string; operator?: "eq" | "gte" };
type ReadinessStatus = "passed" | "warning" | "blocked";

function requiredEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function readinessStatus(blocked: boolean, warning = false): ReadinessStatus {
  if (blocked) return "blocked";
  if (warning) return "warning";
  return "passed";
}

export function pageRange(page = 1) {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * PAGE_SIZE;
  return { page: safePage, from, to: from + PAGE_SIZE - 1, pageSize: PAGE_SIZE };
}

async function count(table: string, filter?: CountFilter) {
  let query = createServiceClient().from(table).select("*", { count: "exact", head: true });
  if (filter) {
    query = filter.operator === "gte"
      ? query.gte(filter.column, filter.value)
      : query.eq(filter.column, filter.value);
  }
  const { count: result } = await query;
  return result ?? 0;
}

export async function getOverviewData() {
  const service = createServiceClient();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [
    usersResult, workspaces, activeWorkspaces, sources, items, documents, reports,
    reportsToday, conversations, messages, failedDocuments, failedReports, storage,
    cost, recentReports, recentWorkspaces,
  ] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1 }),
    count("accounts"),
    count("accounts", { column: "updated_at", value: month, operator: "gte" }),
    count("knowledge_sources"),
    count("knowledge_items"),
    count("documents"),
    count("reports"),
    count("reports", { column: "created_at", value: today, operator: "gte" }),
    count("conversations"),
    count("messages"),
    count("documents", { column: "status", value: "failed" }),
    count("reports", { column: "status", value: "failed" }),
    service.from("documents").select("file_size"),
    service.from("usage_logs").select("estimated_cost_micros").gte("created_at", month),
    service.from("reports").select("id,title,status,category_slug,created_at").order("created_at", { ascending: false }).limit(5),
    service.from("accounts").select("id,user_id,category_slug,plan,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  return {
    metrics: {
      users: usersResult.data && "total" in usersResult.data ? usersResult.data.total : 0,
      workspaces, activeWorkspaces, sources, items, documents, reports, reportsToday,
      conversations, messages, failures: failedDocuments + failedReports,
      storageBytes: (storage.data ?? []).reduce((sum, row) => sum + Number(row.file_size ?? 0), 0),
      costMicros: (cost.data ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_micros ?? 0), 0),
    },
    recentReports: recentReports.data ?? [],
    recentWorkspaces: recentWorkspaces.data ?? [],
  };
}

export async function getUsersData(page = 1, search = "") {
  const service = createServiceClient();
  const range = pageRange(page);
  const { data } = await service.auth.admin.listUsers({ page: range.page, perPage: range.pageSize });
  const users = (data?.users ?? []).filter((user) => {
    const term = search.toLowerCase();
    return !term || user.email?.toLowerCase().includes(term) ||
      String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").toLowerCase().includes(term);
  });
  const ids = users.map((user) => user.id);
  const [accounts, docs, reports, conversations, admins] = ids.length ? await Promise.all([
    service.from("accounts").select("user_id,plan,category_slug").in("user_id", ids),
    service.from("documents").select("user_id,file_size").in("user_id", ids),
    service.from("reports").select("user_id").in("user_id", ids),
    service.from("conversations").select("user_id").in("user_id", ids),
    service.from("platform_admins").select("user_id,role").in("user_id", ids),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const accountRows = (accounts.data ?? []) as DbRow[];
  const documentRows = (docs.data ?? []) as DbRow[];
  const reportRows = (reports.data ?? []) as DbRow[];
  const conversationRows = (conversations.data ?? []) as DbRow[];
  const adminRows = (admins.data ?? []) as DbRow[];

  return {
    users: users.map((user) => ({
      id: user.id,
      email: user.email ?? "Unknown",
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "User",
      role: adminRows.find((row) => row.user_id === user.id)?.role ?? "user",
      created_at: user.created_at,
      last_active_at: user.last_sign_in_at,
      workspaces: accountRows.filter((row) => row.user_id === user.id),
      documents: documentRows.filter((row) => row.user_id === user.id).length,
      storage: documentRows.filter((row) => row.user_id === user.id).reduce((sum, row) => sum + Number(row.file_size ?? 0), 0),
      reports: reportRows.filter((row) => row.user_id === user.id).length,
      conversations: conversationRows.filter((row) => row.user_id === user.id).length,
    })),
    total: data && "total" in data ? data.total : 0,
    ...range,
  };
}

export async function getTableData<T extends DbRow = DbRow>(
  table: string,
  select: string,
  page = 1,
  searchColumn?: string,
  search = "",
) {
  const service = createServiceClient();
  const range = pageRange(page);
  let query = service.from(table).select(select, { count: "exact" })
    .order("created_at", { ascending: false }).range(range.from, range.to);
  if (searchColumn && search) query = query.ilike(searchColumn, `%${search}%`);
  const { data, count: total, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as T[], total: total ?? 0, ...range };
}

export async function getBillingData() {
  const service = createServiceClient();
  const [plans, accounts, documents, reports, queries] = await Promise.all([
    service.from("plans").select("id,name,slug,category_slug,price_monthly,max_storage_bytes,max_queries_day,max_reports_month,creem_product_id").order("price_monthly"),
    service.from("accounts").select("id,user_id,category_slug,plan,subscription_status,billing_provider,created_at"),
    service.from("documents").select("user_id,category_slug,file_size"),
    service.from("usage_logs").select("user_id,category_slug,action,created_at"),
    count("usage_logs", { column: "action", value: "query" }),
  ]);
  return { plans: plans.data ?? [], accounts: accounts.data ?? [], documents: documents.data ?? [], reports: reports.data ?? [], queries };
}

export async function getHealthData() {
  const service = createServiceClient();
  const started = Date.now();
  const db = await service.from("plans").select("id").limit(1);
  const [failedDocuments, failedReports, events, plans, activeCategories, admins, recentQueries] = await Promise.all([
    service.from("documents").select("id,name,error_message,updated_at").eq("status", "failed").order("updated_at", { ascending: false }).limit(10),
    service.from("reports").select("id,title,error_message,updated_at").eq("status", "failed").order("updated_at", { ascending: false }).limit(10),
    service.from("system_events").select("id,type,severity,message,created_at").order("created_at", { ascending: false }).limit(10),
    service.from("plans").select("slug,category_slug,creem_product_id,max_storage_bytes,max_queries_day,max_reports_month"),
    service.from("categories").select("slug").eq("is_active", true),
    service.from("platform_admins").select("user_id").limit(1),
    service.from("usage_logs").select("id").eq("action", "query").order("created_at", { ascending: false }).limit(1),
  ]);
  const planRows = plans.data ?? [];
  const activeCategoryRows = activeCategories.data ?? [];
  const missingPaidPlans = planRows.filter((plan) => plan.slug !== "free" && !plan.creem_product_id);
  const hasCoreEnv = requiredEnv("NEXT_PUBLIC_SUPABASE_URL") &&
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY") &&
    requiredEnv("NEXT_PUBLIC_APP_URL");
  const hasAi = requiredEnv("GROQ_API_KEY") || requiredEnv("OPENAI_API_KEY");
  const hasVector = requiredEnv("QDRANT_URL") && requiredEnv("QDRANT_API_KEY");
  const hasMonitoring = requiredEnv("BETTERSTACK_SOURCE_TOKEN") && requiredEnv("BETTERSTACK_INGESTING_HOST");
  const hasBilling = requiredEnv("CREEM_API_KEY") && requiredEnv("CREEM_WEBHOOK_SECRET") && missingPaidPlans.length === 0;
  const failedCount = (failedDocuments.data?.length ?? 0) + (failedReports.data?.length ?? 0);
  const severeEvents = (events.data ?? []).filter((event) => ["error", "critical"].includes(String(event.severity))).length;
  const readiness = [
    {
      area: "Core configuration",
      status: readinessStatus(!hasCoreEnv),
      detail: hasCoreEnv ? "Supabase and app URL are configured." : "Set Supabase public URL/anon key, service role key, and NEXT_PUBLIC_APP_URL.",
      action: hasCoreEnv ? "No action required." : "Complete production environment variables before launch.",
    },
    {
      area: "Authentication & admin access",
      status: readinessStatus(!admins.data?.length),
      detail: admins.data?.length ? "At least one platform admin exists." : "No platform admin found.",
      action: admins.data?.length ? "Keep admin access limited to trusted users." : "Bootstrap the first platform admin in Supabase.",
    },
    {
      area: "Products, pricing, and limits",
      status: readinessStatus(!activeCategoryRows.length || !planRows.length || !hasBilling, missingPaidPlans.length > 0),
      detail: `${activeCategoryRows.length} active product(s), ${planRows.length} plan row(s).`,
      action: hasBilling ? "Review pricing copy and plan limits before launch." : "Set Creem credentials and paid plan product IDs.",
    },
    {
      area: "Knowledge & AI pipeline",
      status: readinessStatus(!hasAi || !hasVector),
      detail: hasAi && hasVector ? "AI and vector configuration are present." : "AI provider or Qdrant configuration is missing.",
      action: hasAi && hasVector ? "Run a document upload and Q&A smoke test." : "Set AI and vector database credentials.",
    },
    {
      area: "Monitoring",
      status: readinessStatus(!hasMonitoring),
      detail: hasMonitoring ? "Better Stack logging is configured." : "Better Stack logging is not fully configured.",
      action: hasMonitoring ? "Verify logs arrive from production." : "Set Better Stack source token and ingesting host.",
    },
    {
      area: "Reliability & failures",
      status: readinessStatus(false, failedCount > 0 || severeEvents > 0),
      detail: `${failedCount} recent failed processing/report records, ${severeEvents} severe system events shown below.`,
      action: failedCount || severeEvents ? "Review failures before customer onboarding." : "Continue monitoring failed jobs and system events.",
    },
    {
      area: "Usage activity",
      status: readinessStatus(false, !recentQueries.data?.length),
      detail: recentQueries.data?.length ? "Recent query usage exists." : "No recent query usage found.",
      action: "Run account, upload, conversation, report, export, and billing smoke tests before launch.",
    },
  ];
  return {
    services: [
      { name: "App server", status: "healthy", detail: "Admin request completed" },
      { name: "Database", status: db.error ? "degraded" : "healthy", detail: db.error?.message ?? `${Date.now() - started}ms response` },
      { name: "Vector database", status: process.env.QDRANT_URL && process.env.QDRANT_API_KEY ? "configured" : "not configured", detail: "Configuration presence only" },
      { name: "AI provider", status: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY ? "configured" : "not configured", detail: "Configuration presence only" },
      { name: "File storage", status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not configured", detail: "Supabase storage configuration" },
      { name: "Better Stack", status: process.env.BETTERSTACK_SOURCE_TOKEN ? "configured" : "not configured", detail: "Logging configuration presence" },
    ],
    failures: [...(failedDocuments.data ?? []).map((row) => ({ ...row, type: "document_processing" })),
      ...(failedReports.data ?? []).map((row) => ({ ...row, name: row.title, type: "report_generation" }))],
    events: events.data ?? [],
    readiness,
  };
}
