import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import {
  Database,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how HelpexAI collects, uses, protects, and manages your information.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    icon: Database,
    title: "1. Information We Collect",
    content: (
      <>
        <p>We may collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> your name, email address,
            authentication details, and account preferences.
          </li>
          <li>
            <strong>Documents and conversations:</strong> files you upload,
            questions you ask, and AI-generated responses.
          </li>
          <li>
            <strong>Usage information:</strong> product interactions, device and
            browser information, IP address, and diagnostic data.
          </li>
          <li>
            <strong>Public tool information:</strong> email addresses submitted
            with marketing consent, temporary extracted document text, and
            questions asked through the free public tool. Temporary public-tool
            document text is scheduled for deletion after 24 hours.
          </li>
          <li>
            <strong>Payment information:</strong> billing details processed by
            our payment provider. HelpexAI does not store full payment card
            numbers.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: FileText,
    title: "2. How We Use Information",
    content: (
      <>
        <p>We use your information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, maintain, and improve the HelpexAI platform.</li>
          <li>Process documents and generate answers you request.</li>
          <li>Manage accounts, subscriptions, and customer support.</li>
          <li>Protect the platform, prevent misuse, and comply with law.</li>
          <li>Send service-related notices and, where permitted, updates.</li>
        </ul>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "3. How We Share Information",
    content: (
      <>
        <p>
          We do not sell your personal information. We may share information
          with service providers that help us operate HelpexAI, including
          hosting, authentication, payment, analytics, email, and AI processing
          providers. These providers may use information only to perform
          services for us under their applicable agreements.
        </p>
        <p>
          We may also disclose information when required by law, to protect
          rights and safety, or as part of a merger, acquisition, financing, or
          sale of assets.
        </p>
      </>
    ),
  },
  {
    icon: LockKeyhole,
    title: "4. Document Processing, Security, and Retention",
    content: (
      <>
        <p>
          Uploaded documents and prompts may be sent to trusted service
          providers solely to deliver the features you request. You should not
          upload information that you do not have the right or authority to
          process.
        </p>
        <p>
          We use reasonable technical and organizational safeguards designed to
          protect your information. No online service can guarantee absolute
          security. We retain information only as long as reasonably necessary
          to provide the service, meet legal obligations, resolve disputes, and
          enforce agreements.
        </p>
      </>
    ),
  },
  {
    icon: UserRoundCheck,
    title: "5. Your Choices and Rights",
    content: (
      <>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or receive a copy of your personal information, or to object
          to or restrict certain processing.
        </p>
        <p>
          You may update available account information in your settings or
          contact us to submit a privacy request. We may need to verify your
          identity before completing a request.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950">
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] text-zinc-950">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader />

          <main className="flex flex-1 flex-col gap-6 pt-8 sm:gap-8 lg:pt-10">
            <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-10">
              <div className="flex max-w-4xl flex-col gap-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-theme-primary/10 text-theme-primary">
                  <ShieldCheck className="size-6" />
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-theme-primary">
                    Last updated: June 8, 2026
                  </p>
                  <h1 className="text-4xl font-black leading-[2.65rem] tracking-tight text-zinc-950 sm:text-5xl sm:leading-[3rem]">
                    Privacy Policy
                  </h1>
                  <p className="text-lg leading-8 text-[#71717b]">
                    This Privacy Policy explains how HelpexAI collects, uses,
                    shares, and protects information when you use our document
                    intelligence platform.
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
                      6. Children, Changes, and Contact
                    </h2>
                    <div className="flex flex-col gap-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        HelpexAI is not directed to children under 13, and we do
                        not knowingly collect their personal information. We may
                        update this policy from time to time and will post the
                        revised date on this page.
                      </p>
                      <p>
                        For privacy questions or requests, contact us at{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="mailto:privacy@helpexai.com"
                        >
                          privacy@helpexai.com
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
