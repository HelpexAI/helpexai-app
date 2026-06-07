import { SettingsPanel } from "@/components/settings/settings-panel";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SettingsPanel
      workspace={workspace}
      preferences={{
        showCitations: user?.user_metadata.show_citations !== false,
        documentReady: user?.user_metadata.document_ready_notifications !== false,
        productUpdates: user?.user_metadata.product_update_notifications === true,
        usageWarnings: user?.user_metadata.usage_warning_notifications !== false,
      }}
    />
  );
}
