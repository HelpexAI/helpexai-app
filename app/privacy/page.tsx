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
  BrainCircuit,
  Cookie,
  Database,
  FileText,
  Globe2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

export const metadata = createPageMetadata(PUBLIC_PAGE_SEO.privacy);

const lastUpdated = "June 12, 2026";

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
            authentication details, account preferences, and workspace settings.
          </li>
          <li>
            <strong>Documents and workspace content:</strong> files you upload,
            extracted document text, collections, tags, prompts, questions, AI
            responses, generated reports, and related workspace activity.
          </li>
          <li>
            <strong>Usage and technical information:</strong> pages visited,
            product interactions, device type, browser type, IP address,
            approximate location, logs, error reports, and diagnostic data.
          </li>
          <li>
            <strong>Public tool information:</strong> email addresses submitted
            with marketing consent, temporary extracted document text, and
            questions asked through the free public tool. Temporary public-tool
            document text is scheduled for deletion after 24 hours.
          </li>
          <li>
            <strong>Payment and billing information:</strong> subscription plan,
            billing status, payment confirmation, invoice details, tax-related
            details, and payment provider identifiers. HelpexAI does not store
            full payment card numbers.
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
          <li>Provide, operate, maintain, and improve HelpexAI.</li>
          <li>
            Process documents and generate AI answers or reports you request.
          </li>
          <li>Create, manage, and secure user accounts and workspaces.</li>
          <li>Manage subscriptions, billing, refunds, and customer support.</li>
          <li>Monitor usage limits and prevent abuse, fraud, or misuse.</li>
          <li>
            Debug errors, improve performance, and protect platform security.
          </li>
          <li>
            Send service-related notices, account updates, support messages,
            and, where permitted, product or marketing updates.
          </li>
          <li>
            Comply with legal, tax, regulatory, and contractual obligations.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: BrainCircuit,
    title: "3. AI Processing and Document Handling",
    content: (
      <>
        <p>
          HelpexAI uses artificial intelligence to help you search, understand,
          summarize, and generate reports from business documents and workspace
          content.
        </p>
        <p>
          Uploaded documents, extracted text, prompts, questions, metadata, and
          generated outputs may be processed by trusted AI, embedding, database,
          hosting, and infrastructure providers only as needed to provide the
          features you request.
        </p>
        <p>
          You are responsible for ensuring that you have the right and authority
          to upload, process, and use any documents or information submitted to
          HelpexAI. You should not upload illegal content or information you are
          not authorized to process.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "4. How We Share Information",
    content: (
      <>
        <p>
          We do not sell your personal information. We may share information
          with trusted service providers that help us operate HelpexAI,
          including hosting, authentication, database, storage, analytics,
          email, payment, customer support, and AI processing providers.
        </p>
        <p>
          These providers may process information only to provide services to us
          or to you, subject to their applicable agreements and security
          obligations.
        </p>
        <p>
          We may also disclose information if required by law, to protect
          rights, safety, and security, to prevent fraud or abuse, or as part of
          a merger, acquisition, financing, restructuring, or sale of assets.
        </p>
      </>
    ),
  },
  {
    icon: LockKeyhole,
    title: "5. Security",
    content: (
      <>
        <p>
          We use reasonable technical and organizational safeguards designed to
          protect your information from unauthorized access, loss, misuse,
          alteration, or disclosure.
        </p>
        <p>
          These safeguards may include access controls, encrypted connections,
          authentication protections, monitoring, backups, and restricted access
          to production systems.
        </p>
        <p>
          No online platform can guarantee absolute security. You are
          responsible for keeping your login credentials safe and for
          controlling access to your account.
        </p>
      </>
    ),
  },
  {
    icon: Trash2,
    title: "6. Data Retention and Deletion",
    content: (
      <>
        <p>
          We retain account information, documents, conversations, generated
          reports, billing records, logs, and workspace data for as long as
          reasonably necessary to provide HelpexAI, comply with legal
          obligations, resolve disputes, enforce agreements, and maintain
          platform security.
        </p>
        <p>
          Public free-tool document text is temporary and is scheduled for
          deletion after 24 hours.
        </p>
        <p>
          You may request deletion of your account or workspace data by
          contacting us. Some information may be retained where required for
          legal, tax, security, fraud prevention, or backup purposes.
        </p>
      </>
    ),
  },
  {
    icon: Globe2,
    title: "7. International Data Transfers",
    content: (
      <>
        <p>
          HelpexAI and its service providers may process and store information
          in countries other than your own. These countries may have data
          protection laws that differ from the laws where you live.
        </p>
        <p>
          Where required, we rely on appropriate safeguards, contractual
          protections, and provider security commitments to protect information
          transferred internationally.
        </p>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "8. Cookies and Similar Technologies",
    content: (
      <>
        <p>
          HelpexAI may use cookies, local storage, and similar technologies to
          keep you signed in, remember preferences, understand product usage,
          improve performance, detect abuse, and support analytics.
        </p>
        <p>
          You can control cookies through your browser settings. Disabling some
          cookies may affect login, security, or platform functionality.
        </p>
      </>
    ),
  },
  {
    icon: UserRoundCheck,
    title: "9. Your Choices and Rights",
    content: (
      <>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, export, restrict, or object to certain processing of your
          personal information.
        </p>
        <p>
          You may update available account information in your settings or
          contact us to submit a privacy request. We may need to verify your
          identity before completing a request.
        </p>
        <p>
          You may unsubscribe from marketing emails using the unsubscribe link
          in those emails or by contacting us.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webPageJsonLd(PUBLIC_PAGE_SEO.privacy),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Privacy Policy", path: "/privacy" },
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
                  <ShieldCheck className="size-6" />
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-theme-primary">
                    Last updated: {lastUpdated}
                  </p>

                  <h1 className="text-4xl font-black leading-[2.65rem] tracking-tight text-zinc-950 sm:text-5xl sm:leading-[3rem]">
                    Privacy Policy
                  </h1>

                  <p className="text-lg leading-8 text-[#71717b]">
                    This Privacy Policy explains how HelpexAI collects, uses,
                    shares, stores, and protects information when you use our AI
                    document intelligence and business knowledge workspace.
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
                      10. Children, Changes, and Contact
                    </h2>

                    <div className="flex flex-col gap-3 text-sm leading-6 text-[#71717b]">
                      <p>
                        HelpexAI is not directed to children under 13, and we do
                        not knowingly collect personal information from children
                        under 13.
                      </p>

                      <p>
                        We may update this Privacy Policy from time to time. If
                        we make material changes, we will update the date on
                        this page and may provide additional notice where
                        required.
                      </p>

                      <p>
                        For privacy questions, account deletion requests, or
                        data protection requests, contact us at{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="mailto:privacy@helpexai.com"
                        >
                          privacy@helpexai.com
                        </a>
                        .
                      </p>

                      <p>
                        For general support, contact{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="mailto:contact@helpexai.com"
                        >
                          contact@helpexai.com
                        </a>
                        .
                      </p>

                      <p>
                        Operator: HelpexAI. Country: Pakistan. Website:{" "}
                        <a
                          className="font-semibold text-theme-primary"
                          href="https://helpexai.com"
                          target="_blank"
                          rel="noreferrer"
                        >
                          helpexai.com
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
