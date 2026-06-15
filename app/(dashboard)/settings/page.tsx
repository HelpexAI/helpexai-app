import { SettingsPanel } from "@/components/settings/settings-panel";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { getActiveThemes } from "@/lib/themes/catalog";

export default async function SettingsPage() {
  const [workspace, themes] = await Promise.all([
    getCurrentWorkspace(),
    getActiveThemes(),
  ]);

  return (
    <SettingsPanel
      workspace={workspace}
      preferences={workspace.preferences}
      themes={themes}
    />
  );
}
