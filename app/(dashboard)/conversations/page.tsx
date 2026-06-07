import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  return (
    <DashboardPlaceholder
      icon={MessageSquare}
      title="Conversations"
      description="The shared dashboard shell is ready. Conversation selection and chat screens will be added from their Flowstep designs."
    />
  );
}
