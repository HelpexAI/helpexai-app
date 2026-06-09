import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { PublicDocumentTool } from "@/components/public-tool/public-document-tool";
import { FileText, MessageSquare, ShieldCheck, Sparkles, Upload, Zap } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Document AI Tool",
  description: "Upload a document and ask HelpexAI up to five questions without creating an account.",
  alternates: { canonical: "/free-tool" },
};

const steps = [
  { icon: Upload, title: "Upload your document", text: "PDF, DOCX, or TXT up to 10MB." },
  { icon: MessageSquare, title: "Ask in plain English", text: "No technical or legal jargon required." },
  { icon: Sparkles, title: "Get grounded answers", text: "Answers include a source excerpt from your file." },
];

export default function FreeToolPage() {
  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader />
          <main className="flex flex-1 flex-col gap-12 pt-10 sm:pt-14">
            <section className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"><Sparkles className="size-4 text-theme-primary" /> Free Tool - No account required</span>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Ask your document anything</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400 sm:text-lg">Upload one document, add your email, and receive up to five AI-powered answers instantly.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-300"><span className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-zinc-900"><FileText className="mr-1 inline size-3.5 text-theme-primary" /> PDF, DOCX, TXT</span><span className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-zinc-900"><ShieldCheck className="mr-1 inline size-3.5 text-emerald-500" /> Document text deleted after 24 hours</span><span className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-zinc-900"><Zap className="mr-1 inline size-3.5 text-amber-500" /> 5 free answers</span></div>
            </section>

            <section className="mx-auto w-full max-w-3xl"><PublicDocumentTool /></section>

            <section className="grid gap-4 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex size-11 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"><Icon className="size-5" /></div><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{text}</p></article>)}
            </section>

            <section className="rounded-3xl bg-[#0a1628] px-6 py-10 text-center text-white sm:px-10"><h2 className="text-2xl font-bold sm:text-3xl">Need more than five answers?</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">A free HelpexAI account includes 3 documents and 5 questions every day.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="rounded-full bg-theme-primary px-6 py-3 text-sm font-semibold">Create Free Account</Link><Link href="/#pricing" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold">View Pricing</Link></div></section>
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
