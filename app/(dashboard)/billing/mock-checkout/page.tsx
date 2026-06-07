import { MockCheckoutForm } from "@/components/billing/mock-checkout-form";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { mockStripeEnabled } from "@/lib/stripe/subscriptions";
import { redirect } from "next/navigation";

export default async function MockCheckoutPage() {
  if (!mockStripeEnabled()) redirect("/billing");
  const workspace = await getCurrentWorkspace();
  if (workspace.plan === "pro") redirect("/billing");
  return <MockCheckoutForm email={workspace.email} />;
}
