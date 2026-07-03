import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  HelpCircle,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { themeStyle } from "@/lib/theme";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

const category = "business" as const;

const plans = [
  {
    name: "Free",
    slug: "free",
    price: "$0",
    period: "/month",
    description: "For trying HelpexAI with your first business documents.",
    cta: "Start free",
    href: "/signup?category=business",
    highlighted: false,
    features: [
      "15 MB document storage",
      "100 chat queries per day",
      "5 reports per month",
      "Basic document organization",
      "Limited AI conversations",
      "Free public document tool",
    ],
    notIncluded: [],
  },
  {
    name: "Pro",
    slug: "pro",
    price: "$9.99",
    period: "/month",
    description: "For small businesses that need more document intelligence.",
    cta: "Start Pro",
    href: "/signup?category=business&plan=pro",
    highlighted: true,
    badge: "Recommended",
    features: [
      "500 MB document storage",
      "500 chat queries per day",
      "30 reports per month",
      "Collections and tags",
      "Priority usage limits",
      "Export reports",
    ],
    notIncluded: [],
  },
  {
    name: "Premium",
    slug: "premium",
    price: "$19.9",
    period: "/month",
    description:
      "For growing teams using HelpexAI as a business knowledge workspace.",
    cta: "Start Premium",
    href: "/signup?category=business&plan=premium",
    highlighted: false,
    features: [
      "2 GB document storage",
      "Unlimited chat queries",
      "100 reports per month",
      "Advanced business reports",
      "Larger workspace usage",
      "Priority support",
    ],
    notIncluded: [],
  },
];

const faqs = [
  {
    question: "Can I start for free?",
    answer:
      "Yes. You can create a free account and start using HelpexAI without a credit card.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Paid subscriptions can be cancelled anytime.",
  },
  {
    question: "What is HelpexAI used for?",
    answer:
      "HelpexAI helps businesses upload documents, ask AI questions, generate reports, and build a searchable business knowledge workspace.",
  },
];

export const metadata = {
  title: `Pricing | ${SITE_NAME}`,
  description:
    "Simple pricing for HelpexAI Business. Start free and upgrade when you need more documents, AI conversations, and reports.",
  alternates: {
    canonical: absoluteUrl("/pricing"),
  },
};

export default function PricingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "HelpexAI Business",
    description:
      "AI-powered business knowledge workspace for documents, conversations, and reports.",
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.price.replace("$", ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(plan.href),
    })),
  };

  return (
    <div
      className="marketing-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
      style={themeStyle(category)}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader authCategory={category} />

          <main className="flex flex-1 flex-col gap-12 pt-10 sm:gap-16 sm:pt-14">
            <section className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-soft px-4 py-2 text-xs font-semibold text-theme-soft-foreground dark:border-theme-border-dark dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                <Sparkles className="size-4" />
                Simple pricing for business knowledge
              </span>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Start free. Upgrade when your business knowledge grows.
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400 sm:text-lg">
                Use HelpexAI to upload business documents, ask AI questions,
                generate reports, and build a searchable knowledge workspace.
              </p>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={[
                    "relative rounded-3xl border bg-white p-6 shadow-sm dark:bg-zinc-900 sm:p-7",
                    plan.highlighted
                      ? "border-theme-primary shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
                      : "border-zinc-200 dark:border-zinc-800",
                  ].join(" ")}
                >
                  {plan.badge ? (
                    <span className="absolute right-6 top-6 rounded-full bg-theme-primary px-3 py-1 text-xs font-bold text-theme-primary-foreground">
                      {plan.badge}
                    </span>
                  ) : null}

                  <h2 className="text-2xl font-black">{plan.name}</h2>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-5xl font-black tracking-tight">
                      {plan.price}
                    </span>
                    <span className="pb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {plan.period}
                    </span>
                  </div>

                  <Link
                    href={plan.href}
                    className={[
                      "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition",
                      plan.highlighted
                        ? "bg-theme-primary text-theme-primary-foreground hover:bg-theme-primary-hover"
                        : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900",
                    ].join(" ")}
                  >
                    {plan.cta}
                    <ArrowRight className="size-4" />
                  </Link>

                  <div className="mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                    <p className="text-sm font-bold">Included</p>

                    <ul className="mt-4 space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm leading-6"
                        >
                          <Check className="mt-1 size-4 shrink-0 text-theme-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}

                      {plan.notIncluded.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm leading-6 text-zinc-400"
                        >
                          <X className="mt-1 size-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7 md:grid-cols-3">
              {[
                {
                  icon: FileText,
                  title: "Documents",
                  text: "Upload business documents and turn them into searchable AI knowledge.",
                },
                {
                  icon: MessageSquareText,
                  title: "AI conversations",
                  text: "Ask questions and get answers grounded in your uploaded documents.",
                },
                {
                  icon: ShieldCheck,
                  title: "Business reports",
                  text: "Generate summaries, risk reports, decision briefs, and action plans.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
                >
                  <Icon className="size-6 text-theme-primary" />
                  <h2 className="mt-4 text-lg font-bold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {text}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-3xl bg-[#0a1628] px-6 py-10 text-white sm:px-10">
              <div className="grid items-center gap-7 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-bold text-theme-primary">
                    Free plan available
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    Build your AI business knowledge workspace today
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                    Start organizing your company documents and upgrade when you
                    need more capacity, reports, and AI usage.
                  </p>
                </div>

                <Link
                  href="/signup?category=business"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-theme-primary px-6 py-3 text-sm font-semibold text-theme-primary-foreground"
                >
                  Create free account
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </section>

            <section>
              <h2 className="text-3xl font-black tracking-tight">
                Frequently asked questions
              </h2>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {faqs.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <HelpCircle className="size-5 text-theme-primary" />
                    <h3 className="mt-4 font-bold">{item.question}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      {item.answer}
                    </p>
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
