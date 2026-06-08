import { SettingsPanel } from "@/components/settings/settings-panel";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <SettingsPanel
      workspace={workspace}
      preferences={workspace.preferences}
    />
  );
}
