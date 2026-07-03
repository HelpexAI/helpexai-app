import { SubscriptionManagement } from "@/components/billing/subscription-management";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { normalizePlanSlug } from "@/lib/plans/limits";
import { createServiceClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ManageSubscriptionPage() {
  noStore();

  const workspace = await getCurrentWorkspace();
  const service = createServiceClient();

  const { data: account } = await service
    .from("accounts")
    .select(
      "plan, subscription_status, creem_subscription_id, creem_current_period_end",
    )
    .eq("user_id", workspace.userId)
    .eq("category_slug", workspace.category)
    .maybeSingle();

  return (
    <SubscriptionManagement
      plan={normalizePlanSlug(account?.plan)}
      subscriptionStatus={account?.subscription_status ?? null}
      currentPeriodEnd={account?.creem_current_period_end ?? null}
      hasSubscription={Boolean(account?.creem_subscription_id)}
    />
  );
}
