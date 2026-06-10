import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileSearch,
  MessageSquareText,
  Scale,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { themeStyle } from "@/lib/theme";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import type { Product } from "@/types";

type ProductCategory = "legal" | "business";

type ProductConfig = {
  category: ProductCategory;
  name: string;
  eyebrow: string;
  headline: string;
  description: string;
  audience: string;
  icon: LucideIcon;
  outcomes: string[];
  useCases: { title: string; description: string; icon: LucideIcon; href: string }[];
  faq: { question: string; answer: string }[];
};

const products: Record<ProductCategory, ProductConfig> = {
  legal: {
    category: "legal",
    name: "Helpex Legal",
    eyebrow: "AI document intelligence for legal professionals",
    headline: "Review legal documents with clarity, speed, and citations",
    description:
      "Ask questions across contracts, agreements, policies, and case files. Helpex Legal returns grounded answers with source citations so your team can review documents faster.",
    audience: "law firms, in-house counsel, legal operations teams, and consultants",
    icon: Scale,
    outcomes: [
      "Find clauses and obligations in seconds",
      "Summarize lengthy agreements",
      "Compare terms across documents",
      "Review answers with exact source citations",
    ],
    useCases: [
      {
        icon: FileSearch,
        title: "Contract review",
        href: "/legal/contract-analysis",
        description:
          "Locate termination terms, renewal dates, liabilities, and obligations without manually scanning every page.",
      },
      {
        icon: SearchCheck,
        title: "Risk discovery",
        href: "/legal/nda-review",
        description:
          "Ask focused questions about unusual clauses, missing protections, and terms that deserve closer review.",
      },
      {
        icon: MessageSquareText,
        title: "Cited legal Q&A",
        href: "/blog/ai-document-analysis-for-lawyers",
        description:
          "Get plain-language answers linked back to the relevant document and page for efficient verification.",
      },
    ],
    faq: [
      {
        question: "Does Helpex Legal replace a lawyer?",
        answer:
          "No. Helpex Legal helps professionals analyze and navigate documents faster, but its answers are informational and should be verified by qualified legal counsel.",
      },
      {
        question: "Which legal documents can I analyze?",
        answer:
          "You can upload text-based PDF, DOCX, and TXT files, including contracts, NDAs, policies, agreements, and legal reports.",
      },
      {
        question: "Can answers include document citations?",
        answer:
          "Yes. Helpex Legal is designed to ground answers in your selected documents and display supporting source citations when available.",
      },
    ],
  },
  business: {
    category: "business",
    name: "Helpex Business",
    eyebrow: "AI document intelligence for growing businesses",
    headline: "Turn business documents into clear, actionable answers",
    description:
      "Understand contracts, invoices, policies, proposals, and reports without losing hours to manual review. Helpex Business helps your team find the details that affect decisions.",
    audience: "small businesses, operators, founders, finance teams, and consultants",
    icon: BriefcaseBusiness,
    outcomes: [
      "Compare invoices against agreements",
      "Understand vendor and customer terms",
      "Summarize policies and reports",
      "Give teams fast, source-backed answers",
    ],
    useCases: [
      {
        icon: FileSearch,
        title: "Vendor document review",
        href: "/business/vendor-contract-review",
        description:
          "Quickly understand pricing, commitments, renewal dates, and service terms before making business decisions.",
      },
      {
        icon: SearchCheck,
        title: "Invoice comparison",
        href: "/business/invoice-analysis",
        description:
          "Compare invoices with contracts and identify mismatched charges, rates, or line items across documents.",
      },
      {
        icon: MessageSquareText,
        title: "Operational knowledge",
        href: "/blog/best-ai-workflows-for-small-business-documents",
        description:
          "Turn policies, reports, and internal documents into a searchable source of answers for your team.",
      },
    ],
    faq: [
      {
        question: "Who is Helpex Business built for?",
        answer:
          "Helpex Business is designed for founders, small business owners, operators, finance teams, and consultants who regularly review business documents.",
      },
      {
        question: "Can Helpex Business compare multiple documents?",
        answer:
          "Yes. You can attach multiple documents to a conversation and ask questions that compare their terms or information.",
      },
      {
        question: "Which files can I upload?",
        answer:
          "HelpexAI supports text-based PDF, DOCX, and TXT files. Uploaded documents should contain readable text rather than only scanned images.",
      },
    ],
  },
};

export function ProductLandingPage({ category, databaseProduct }: { category: ProductCategory; databaseProduct?: Product }) {
  const baseProduct = products[category];
  const marketing = databaseProduct?.marketing ?? {};
  const product = {
    ...baseProduct,
    name: databaseProduct?.name ?? baseProduct.name,
    description: databaseProduct?.description || baseProduct.description,
    eyebrow: String(marketing.eyebrow || baseProduct.eyebrow),
    headline: String(marketing.headline || databaseProduct?.hero_message || baseProduct.headline),
    audience: String(marketing.audience || baseProduct.audience),
  };
  const ProductIcon = product.icon;
  const signupHref = `/signup?category=${category}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: product.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: absoluteUrl(`/${category}`),
        description: product.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free plan available",
        },
        provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: product.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <div
      className="marketing-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
      style={themeStyle(databaseProduct?.theme ?? category)}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader authCategory={category} />
          <main className="flex flex-1 flex-col gap-10 pt-10 sm:gap-14 sm:pt-14">
            <section className="grid items-center gap-9 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-soft px-4 py-2 text-xs font-semibold text-theme-soft-foreground dark:border-theme-border-dark dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                  <Sparkles className="size-4" />
                  {product.eyebrow}
                </span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {product.headline}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400 sm:text-lg">
                  {product.description}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={signupHref}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-theme-primary px-6 py-3 text-sm font-semibold text-theme-primary-foreground shadow-sm hover:bg-theme-primary-hover"
                  >
                    Start with {product.name}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/free-tool"
                    className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    Try the free document tool
                  </Link>
                </div>
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Free forever plan. No credit card required.
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
                <div className="flex items-center gap-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-theme-primary text-theme-primary-foreground">
                    <ProductIcon className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-bold">{product.name} workspace</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Secure document intelligence
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {product.outcomes.map((outcome) => (
                    <div
                      key={outcome}
                      className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-theme-primary" />
                      {outcome}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="marketing-deferred grid gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7 md:grid-cols-3">
              {[
                { icon: Upload, title: "Upload", text: "Add PDF, DOCX, or TXT documents to your secure workspace." },
                { icon: MessageSquareText, title: "Ask", text: "Ask natural-language questions across the documents you select." },
                { icon: ShieldCheck, title: "Verify", text: "Review clear answers and supporting document citations." },
              ].map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
                  <Icon className="size-6 text-theme-primary" />
                  <h2 className="mt-4 text-lg font-bold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{text}</p>
                </article>
              ))}
            </section>

            <section className="marketing-deferred">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-wider text-theme-primary">Built for your workflow</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Practical document AI for {product.audience}
                </h2>
              </div>
              <div className="mt-7 grid gap-5 md:grid-cols-3">
                {product.useCases.map(({ icon: Icon, title, description, href }) => (
                  <article key={title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
                    <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-theme-primary">
                      Learn more <ArrowRight className="size-4" />
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            <section id="pricing" className="marketing-deferred rounded-3xl bg-[#0a1628] px-6 py-10 text-white sm:px-10">
              <div className="grid items-center gap-7 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-bold text-theme-primary">Start free, upgrade when ready</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    Put {product.name} to work today
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                    The free plan includes 3 documents, 5 questions per day, and unlimited conversations. Paid plans start at $29 per month.
                  </p>
                </div>
                <Link
                  href={signupHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-theme-primary px-6 py-3 text-sm font-semibold text-theme-primary-foreground"
                >
                  Create your free account
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </section>

            <section className="marketing-deferred">
              <h2 className="text-3xl font-black tracking-tight">Frequently asked questions</h2>
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {product.faq.map((item) => (
                  <article key={item.question} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-bold">{item.question}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
