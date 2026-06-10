import type { Metadata } from "next";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";
import type { CategorySlug } from "@/types";

export const metadata: Metadata = {
  title: "Check Your Email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const category: CategorySlug | undefined = resolvedSearchParams.category || undefined;

  return <VerifyEmailCard email={resolvedSearchParams.email} category={category} />;
}
