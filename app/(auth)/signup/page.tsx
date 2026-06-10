import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getActiveProducts } from "@/lib/products/catalog";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your HelpexAI Legal or Business account.",
};

export default async function SignupPage() {
  const products = await getActiveProducts();
  return (
    <Suspense fallback={<div className="h-[640px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
      <SignupForm products={products} />
    </Suspense>
  );
}
