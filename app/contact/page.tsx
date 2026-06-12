import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact | HelpexAI",
  description: "Get in touch with the HelpexAI team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950">
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader />

          <main className="flex flex-1 flex-col gap-6 pt-8 sm:gap-8 lg:pt-10">
            <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-10 shadow-sm">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-theme-primary/10 text-theme-primary">
                  <MessageSquare className="size-7" />
                </div>

                <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                  Contact Us
                </h1>

                <p className="mt-4 text-lg text-zinc-500">
                  Questions, support requests, billing inquiries, or privacy
                  concerns? We&apos;d be happy to help.
                </p>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-theme-primary" />
                  <h2 className="text-lg font-bold">General Support</h2>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-500">
                  For product questions, account issues, billing support, or
                  general inquiries.
                </p>

                <a
                  href="mailto:support@helpexai.com"
                  className="mt-4 inline-block font-semibold text-theme-primary"
                >
                  muhammadarslan0111@gmail.com
                </a>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-theme-primary" />
                  <h2 className="text-lg font-bold">Privacy Requests</h2>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-500">
                  For privacy questions, account deletion requests, or data
                  protection inquiries.
                </p>

                <a
                  href="mailto:privacy@helpexai.com"
                  className="mt-4 inline-block font-semibold text-theme-primary"
                >
                  muhammadarslan0111@gmail.com
                </a>
              </article>
            </section>
          </main>

          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
