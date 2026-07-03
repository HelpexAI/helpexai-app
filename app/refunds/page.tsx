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
  CreditCard,
  FileWarning,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

export const metadata = createPageMetadata(PUBLIC_PAGE_SEO.refunds);

const lastUpdated = "June 12, 2026";

export default function RefundPolicyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webPageJsonLd(PUBLIC_PAGE_SEO.refunds),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Refund Policy", path: "/refunds" },
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
                  <RefreshCcw className="size-6" />
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-theme-primary">
                    Last updated: {lastUpdated}
                  </p>

                  <h1 className="text-4xl font-black leading-[2.65rem] tracking-tight text-zinc-950 sm:text-5xl sm:leading-[3rem]">
                    Refund Policy
                  </h1>

                  <p className="text-lg leading-8 text-[#71717b]">
                    This Refund Policy explains how cancellations, refunds, and
                    billing are handled for HelpexAI subscriptions.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6">
              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="flex gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                    <CreditCard className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">Subscription Billing</h2>

                    <div className="mt-3 space-y-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        HelpexAI operates on a subscription basis. Subscription
                        fees are billed in advance for the selected billing
                        period.
                      </p>

                      <p>
                        By purchasing a subscription, you authorize our payment
                        provider to charge your chosen payment method according
                        to your selected plan.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="flex gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                    <RefreshCcw className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">Cancellation Policy</h2>

                    <div className="mt-3 space-y-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        You may cancel your subscription at any time through
                        your account settings, billing portal, or by contacting
                        support.
                      </p>

                      <p>
                        When you cancel a subscription, future renewals are
                        stopped.
                      </p>

                      <p>
                        Cancellation may be scheduled for the end of the current
                        billing period, and paid access may remain available
                        until that period ends.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="flex gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                    <FileWarning className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">Refund Policy</h2>

                    <div className="mt-3 space-y-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        Unless otherwise required by applicable law, payments
                        made for HelpexAI subscriptions are non-refundable.
                      </p>

                      <p>We do not provide refunds for:</p>

                      <ul className="list-disc space-y-2 pl-5">
                        <li>Unused subscription time.</li>
                        <li>Partially used billing periods.</li>
                        <li>Failure to cancel before renewal.</li>
                        <li>Changes in feature usage requirements.</li>
                        <li>User preference changes after purchase.</li>
                      </ul>

                      <p>
                        Refund requests may be reviewed on a case-by-case basis
                        where exceptional circumstances exist.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="flex gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                    <ShieldCheck className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      Failed Payments and Chargebacks
                    </h2>

                    <div className="mt-3 space-y-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        If a payment fails, we may retry the charge through our
                        payment provider.
                      </p>

                      <p>
                        We reserve the right to suspend or limit access to paid
                        features until outstanding balances are resolved.
                      </p>

                      <p>
                        Fraudulent chargebacks, abuse of refund requests, or
                        violations of our Terms of Service may result in account
                        suspension or termination.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="flex gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-theme-primary">
                    <Mail className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      Contact for Billing Questions
                    </h2>

                    <div className="mt-3 space-y-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        If you have questions regarding billing, cancellations,
                        or refund requests, please contact:
                      </p>

                      <p>
                        <a
                          href="mailto:support@helpexai.com"
                          className="font-semibold text-theme-primary"
                        >
                          support@helpexai.com
                        </a>
                      </p>

                      <p>
                        We aim to respond to billing-related requests within a
                        reasonable timeframe.
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
