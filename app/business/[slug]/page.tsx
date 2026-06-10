import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UseCasePage } from "@/components/marketing/use-case-page";
import { getUseCase, useCases } from "@/lib/marketing/content";
import { absoluteUrl } from "@/lib/seo";

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
  const path = `/business/${useCase.slug}`;
  return {
    title: useCase.title,
    description: useCase.description,
    alternates: { canonical: path },
    openGraph: {
      title: useCase.title,
      description: useCase.description,
      url: absoluteUrl(path),
    },
  };
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
