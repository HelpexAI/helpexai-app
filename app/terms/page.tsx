import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import {
  breadcrumbJsonLd,
  createPageMetadata,
  jsonLdScript,
  PUBLIC_PAGE_SEO,
  webPageJsonLd,
} from "@/lib/seo";
import {
  AlertTriangle,
  BrainCircuit,
  CreditCard,
  FileText,
  Gavel,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

export const metadata = createPageMetadata(PUBLIC_PAGE_SEO.terms);

const lastUpdated = "June 12, 2026";

const sections = [
  {
    icon: UserRoundCheck,
    title: "1. Acceptance of Terms",
    content: (
      <>
        <p>
          Welcome to HelpexAI. These Terms of Service govern your access to and
          use of the HelpexAI website, applications, and related services.
        </p>
        <p>
          By creating an account, accessing, or using HelpexAI, you agree to be
          bound by these Terms. If you do not agree, you may not use the
          service.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: "2. About HelpexAI",
    content: (
      <>
        <p>
          HelpexAI is an AI-powered business knowledge workspace that allows
          users to upload documents, organize information, ask questions,
          generate reports, and interact with business knowledge using
          artificial intelligence.
        </p>
        <p>
          We may add, modify, limit, or remove features from time to time as the
          product evolves.
        </p>
      </>
    ),
  },
  {
    icon: LockKeyhole,
    title: "3. Accounts and Eligibility",
    content: (
      <>
        <p>
          You must be at least 18 years old or the age of legal majority in your
          jurisdiction to use HelpexAI.
        </p>
        <p>
          You are responsible for maintaining the confidentiality of your login
          credentials and for all activity that occurs under your account.
        </p>
        <p>
          You agree to provide accurate account information and to notify us if
          you believe your account has been compromised.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "4. User Content",
    content: (
      <>
        <p>
          You retain ownership of documents, files, prompts, conversations,
          generated reports, and other content you submit to HelpexAI.
        </p>
        <p>
          By using HelpexAI, you grant us a limited license to host, store,
          process, analyze, and transmit your content only as needed to provide
          and improve the service.
        </p>
        <p>
          You confirm that you have the necessary rights and authority to
          upload, process, and use any content submitted to HelpexAI.
        </p>
      </>
    ),
  },
  {
    icon: BrainCircuit,
    title: "5. Artificial Intelligence Outputs",
    content: (
      <>
        <p>
          HelpexAI uses artificial intelligence to generate answers, summaries,
          reports, and related outputs.
        </p>
        <p>
          AI-generated content may be inaccurate, incomplete, outdated, or
          misleading. You are responsible for reviewing and validating outputs
          before relying on them.
        </p>
        <p>
          HelpexAI does not provide legal, financial, medical, tax, compliance,
          or professional advice.
        </p>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    title: "6. Prohibited Uses",
    content: (
      <>
        <p>You may not use HelpexAI to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Violate any law, regulation, contract, or third-party right.</li>
          <li>Upload malware, viruses, harmful code, or illegal content.</li>
          <li>Attempt unauthorized access to systems, accounts, or data.</li>
          <li>Upload content you do not have permission to process.</li>
          <li>Generate fraudulent, abusive, deceptive, or harmful content.</li>
          <li>Reverse engineer, scrape, overload, or misuse the platform.</li>
          <li>
            Interfere with the security, stability, or operation of HelpexAI.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: CreditCard,
    title: "7. Subscriptions and Billing",
    content: (
      <>
        <p>
          Some HelpexAI features may require a paid subscription. By purchasing
          a subscription, you authorize our payment provider to charge your
          selected payment method.
        </p>
        <p>
          Subscription fees are billed in advance and may renew automatically
          unless cancellation is scheduled before the next billing period.
        </p>
        <p>
          Failure to pay applicable fees may result in suspension, downgrade, or
          limitation of paid features.
        </p>
      </>
    ),
  },
  {
    icon: RefreshCcw,
    title: "8. Cancellation and Refunds",
    content: (
      <>
        <p>
          You may cancel your subscription at any time through your account,
          billing portal, or by contacting support. Cancellation may be
          scheduled for the end of your current billing period.
        </p>
        <p>
          Unless required by law, subscription payments are non-refundable,
          partial billing periods are not refunded, and access remains available
          until the end of the current billing period. After that period ends,
          paid plan access may be downgraded to the free plan.
        </p>
        <p>Refund requests may be reviewed on a case-by-case basis.</p>
      </>
    ),
  },
  {
    icon: Gavel,
    title: "9. Service Availability and Liability",
    content: (
      <>
        <p>
          HelpexAI is provided on an “as is” and “as available” basis. We do not
          guarantee uninterrupted, error-free, or fully secure operation.
        </p>
        <p>
          To the maximum extent permitted by law, HelpexAI and its operators are
          not liable for lost profits, lost data, business interruption,
          indirect damages, special damages, or consequential damages.
        </p>
        <p>
          Our total liability shall not exceed the amount paid by you to
          HelpexAI during the twelve months before the event giving rise to the
          claim.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webPageJsonLd(PUBLIC_PAGE_SEO.terms),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Terms of Service", path: "/terms" },
      ]),
    ],
  };

  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] text-zinc-950">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader />

          <main className="flex flex-1 flex-col gap-6 pt-8 sm:gap-8 lg:pt-10">
            <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-10">
              <div className="flex max-w-4xl flex-col gap-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-theme-primary/10 text-theme-primary">
                  <FileText className="size-6" />
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-theme-primary">
                    Last updated: {lastUpdated}
                  </p>

                  <h1 className="text-4xl font-black leading-[2.65rem] tracking-tight text-zinc-950 sm:text-5xl sm:leading-[3rem]">
                    Terms of Service
                  </h1>

                  <p className="text-lg leading-8 text-[#71717b]">
                    These Terms explain the rules for using HelpexAI, including
                    accounts, uploaded content, AI-generated outputs,
                    subscriptions, cancellations, and platform usage.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6">
              {sections.map(({ icon: Icon, title, content }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8"
                >
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                      <Icon className="size-5" />
                    </div>

                    <div className="flex max-w-5xl flex-col gap-3">
                      <h2 className="text-xl font-bold leading-7">{title}</h2>

                      <div className="flex flex-col gap-3 text-sm leading-6 text-[#71717b]">
                        {content}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                    <Mail className="size-5" />
                  </div>

                  <div className="flex max-w-5xl flex-col gap-3">
                    <h2 className="text-xl font-bold leading-7">
                      10. Contact Information
                    </h2>

                    <div className="flex flex-col gap-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        For questions about these Terms, subscriptions, account
                        access, or support, contact us at{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="mailto:support@helpexai.com"
                        >
                          muhammadarslan0111@gmail.com
                        </a>
                        .
                      </p>

                      <p>
                        For privacy-related requests, contact{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="mailto:privacy@helpexai.com"
                        >
                          muhammadarslan0111@gmail.com
                        </a>
                        .
                      </p>

                      <p>
                        Operator: HelpexAI. Country: Pakistan. Website:{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="https://helpexai.tiwanaconnect.com"
                          target="_blank"
                          rel="noreferrer"
                        >
                          helpexai.tiwanaconnect.com
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </main>

          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
