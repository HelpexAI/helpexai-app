import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UseCasePage } from "@/components/marketing/use-case-page";
import { getUseCase, useCases } from "@/lib/marketing/content";
import { BUSINESS_PAGE_SEO, createPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return useCases
    .filter((item) => item.category === "business")
    .map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const useCase = getUseCase("business", (await params).slug);
  if (!useCase) return {};
  const seo = BUSINESS_PAGE_SEO[useCase.slug as keyof typeof BUSINESS_PAGE_SEO] ?? {
    title: useCase.title,
    description: useCase.description,
    path: `/business/${useCase.slug}`,
  };
  return createPageMetadata(seo);
}

export default async function BusinessUseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const useCase = getUseCase("business", (await params).slug);
  if (!useCase) notFound();
  return <UseCasePage useCase={useCase} />;
}
