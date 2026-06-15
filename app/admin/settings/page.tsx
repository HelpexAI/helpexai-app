import { AdminSettingsPanel } from "@/components/admin/admin-settings-panel";
import { requireAdminUser } from "@/lib/admin/auth";

export default async function AdminSettingsPage() {
  const { service } = await requireAdminUser();
  const [products, collections, tags, reportTemplates, plans] = await Promise.all([
    service.from("categories").select("slug,name").order("sort_order"),
    service.from("collections").select("id,category_slug,name,description,ai_context,icon,is_active").order("category_slug").order("sort_order"),
    service.from("tags").select("id,category_slug,name,description,ai_context,color,is_active").order("category_slug").order("sort_order"),
    service.from("report_templates").select("id,category_slug,slug,name,description,icon,type,goal,system_prompt,user_prompt_template,visibility,status,min_plan,sort_order,model,temperature,max_documents,max_context_chunks").order("category_slug").order("sort_order"),
    service.from("plans").select("id,name,slug,category_slug,price_monthly,creem_product_id,max_storage_bytes,max_queries_day,max_reports_month").order("category_slug").order("price_monthly"),
  ]);
  return (
    <AdminSettingsPanel
      products={products.data ?? []}
      collections={collections.data ?? []}
      tags={tags.data ?? []}
      reportTemplates={reportTemplates.data ?? []}
      plans={plans.data ?? []}
    />
  );
}
