import type { Metadata } from "next";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";
import type { CategorySlug } from "@/types";

export const metadata: Metadata = {
  title: "Check Your Email",
};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; category?: string };
}) {
  const category: CategorySlug | undefined =
    searchParams.category === "legal" || searchParams.category === "business"
      ? searchParams.category
      : undefined;

  return <VerifyEmailCard email={searchParams.email} category={category} />;
}
