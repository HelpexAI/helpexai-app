import { DocumentLibrary } from "@/components/documents/document-library";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/stripe/plans";

export default async function DocumentsPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const [{ data: documents }, { data: plan }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", workspace.userId)
      .eq("category_slug", workspace.category)
      .order("created_at", { ascending: false }),
    supabase
      .from("plans")
      .select("max_documents")
      .eq("slug", workspace.plan)
      .eq("category_slug", workspace.category)
      .maybeSingle(),
  ]);

  return (
    <DocumentLibrary
      documents={documents ?? []}
      category={workspace.category}
      maxDocuments={plan?.max_documents ?? PLAN_LIMITS[workspace.plan].max_documents}
      requiresResolution={workspace.documentsOverLimit}
    />
  );
}
