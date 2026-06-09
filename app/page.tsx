import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing-header";
import {
  Briefcase,
  Check,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950">
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] text-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          {/* Header */}
          <MarketingHeader />

          {/* Main */}
          <main className="flex flex-1 flex-col gap-8 pt-8 lg:gap-12 lg:pt-10">
            {/* Hero */}
            <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 xl:gap-20">
              <div className="flex flex-col gap-6">
                <div className="inline-flex shadow-sm font-medium rounded-full bg-white text-[#71717b] text-xs leading-4 border border-zinc-200 px-4 py-2 items-center gap-2 w-fit">
                  <Sparkles className="size-4 text-theme-primary" />
                  AI answers for legal and business documents
                </div>
                <div className="flex flex-col gap-4">
                  <h1 className="max-w-[620px] text-4xl font-black leading-[2.65rem] tracking-tight text-zinc-950 sm:text-5xl sm:leading-[3rem] xl:text-6xl xl:leading-[3.65rem]">
                    Your Documents. Your AI Expert
                  </h1>
                  <p className="max-w-[640px] text-[#71717b] text-lg leading-8">
                    Upload any document and get instant AI-powered answers —
                    built for legal professionals and SMB owners.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href="/signup?category=legal"
                    className="shadow-sm font-semibold rounded-full bg-theme-primary text-theme-primary-foreground text-sm leading-5 px-6 py-3"
                  >
                    Try Helpex Legal
                  </Link>
                  <Link
                    href="/signup?category=business"
                    className="shadow-sm font-semibold rounded-full bg-white text-zinc-950 text-sm leading-5 border border-zinc-200 px-6 py-3"
                  >
                    Try Helpex Business
                  </Link>
                </div>
                <p className="font-medium text-[#71717b] text-sm leading-5">
                  Free forever • No credit card
                </p>
              </div>

              {/* Hero Card */}
              <div className="relative flex justify-end">
                <div className="rounded-full bg-theme-primary/5 absolute right-8 top-6 w-72 h-72" />
                <div className="relative flex w-full flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6 lg:max-w-[620px]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-zinc-100 text-zinc-950 flex justify-center items-center">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-5">
                          HelpexAI Workspace
                        </p>
                        <p className="text-[#71717b] text-xs leading-4">
                          Live document intelligence
                        </p>
                      </div>
                    </div>
                    <div className="font-medium rounded-full text-[#71717b] text-xs leading-4 border border-zinc-200 flex px-3 py-1 items-center gap-2">
                      <ShieldCheck className="size-3.5 text-theme-primary" />
                      Secure
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl bg-zinc-100 border border-zinc-200 p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold uppercase text-[#71717b] text-xs leading-4 tracking-wide">
                          Contract Review
                        </span>
                        <MoreHorizontal className="size-4 text-[#71717b]" />
                      </div>
                      <div className="space-y-3 mt-4">
                        <div className="shadow-sm rounded-xl bg-white p-3">
                          <p className="font-medium text-[#71717b] text-xs leading-4">
                            Question
                          </p>
                          <p className="font-semibold text-sm leading-5 mt-1">
                            What is the termination notice period?
                          </p>
                        </div>
                        <div className="shadow-sm rounded-xl bg-theme-primary text-theme-primary-foreground p-3">
                          <p className="font-medium opacity-90 text-xs leading-4">
                            Answer
                          </p>
                          <p className="font-semibold text-sm leading-5 mt-1">
                            30 days written notice is required.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="shadow-sm rounded-2xl bg-white border border-zinc-200 p-4">
                        <div className="font-semibold text-[#71717b] text-xs leading-4 flex items-center gap-2">
                          <Upload className="size-4 text-theme-primary" />
                          Upload
                        </div>
                        <div className="rounded-xl bg-zinc-100 border border-dashed border-zinc-200 mt-3 h-24" />
                      </div>
                      <div className="shadow-sm rounded-2xl bg-white border border-zinc-200 p-4">
                        <div className="font-semibold text-[#71717b] text-xs leading-4 flex items-center gap-2">
                          <MessageSquare className="size-4 text-theme-primary" />
                          Ask AI
                        </div>
                        <div className="space-y-2 mt-3">
                          <div className="w-3/4 rounded-full bg-zinc-100 h-2" />
                          <div className="w-1/2 rounded-full bg-zinc-100 h-2" />
                          <div className="w-2/3 rounded-full bg-zinc-100 h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How it works */}
            <section
              id="features"
              className="marketing-deferred grid grid-cols-1 gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 md:grid-cols-3 md:gap-6"
            >
              {[
                {
                  icon: Upload,
                  step: "1",
                  title: "Upload",
                  desc: "Drop contracts, invoices, policies, and reports into a secure workspace.",
                },
                {
                  icon: MessageSquare,
                  step: "2",
                  title: "Ask",
                  desc: "Ask plain-English questions and get precise answers from your documents.",
                },
                {
                  icon: CheckCircle2,
                  step: "3",
                  title: "Get Answers",
                  desc: "Receive cited responses, summaries, and next-step recommendations instantly.",
                },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div
                  key={step}
                  className="shadow-sm rounded-2xl bg-white border border-zinc-200 flex p-6 flex-col gap-4"
                >
                  <div className="size-12 rounded-2xl bg-zinc-100 text-theme-primary flex justify-center items-center">
                    <Icon className="size-6" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="size-8 font-bold rounded-full bg-theme-primary text-theme-primary-foreground text-sm leading-5 flex justify-center items-center">
                        {step}
                      </span>
                      <h3 className="font-bold text-xl leading-7">{title}</h3>
                    </div>
                    <p className="text-[#71717b] text-sm leading-6">{desc}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Category Cards */}
            <section className="marketing-deferred grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div
                className="shadow-sm rounded-3xl bg-white border-l-4 border-l-theme-primary border border-zinc-200 p-6 gap-4 flex flex-col"
                id="legal"
              >
                <div className="size-12 rounded-2xl bg-zinc-100 text-theme-primary flex justify-center items-center">
                  <Scale className="size-6" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-bold text-2xl leading-8">Helpex Legal</h3>
                  <p className="text-[#71717b] text-sm leading-6">
                    Built for lawyers and legal teams who need fast clause
                    lookup, contract summaries, and reliable document Q&A.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm leading-5 text-[#71717b] sm:grid-cols-2">
                  {[
                    "Clause extraction",
                    "Citation-backed answers",
                    "Risk spotting",
                    "Matter summaries",
                  ].map((f) => (
                    <div
                      key={f}
                      className="rounded-xl bg-zinc-100 border border-zinc-200 p-3"
                    >
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/legal"
                  className="mt-2 inline-flex items-center gap-2 font-semibold text-theme-primary text-sm"
                >
                  Get started with Legal →
                </Link>
              </div>

              <div
                className="shadow-sm rounded-3xl bg-white border-l-4 border-l-emerald-500 border border-zinc-200 p-6 gap-4 flex flex-col"
                id="business"
              >
                <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex justify-center items-center">
                  <Briefcase className="size-6" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-bold text-2xl leading-8">
                    Helpex Business
                  </h3>
                  <p className="text-[#71717b] text-sm leading-6">
                    Designed for SMB owners to understand vendor agreements,
                    policies, and operational documents without legal overhead.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm leading-5 text-[#71717b] sm:grid-cols-2">
                  {[
                    "Invoice insights",
                    "Policy summaries",
                    "Vendor review",
                    "Team-ready answers",
                  ].map((f) => (
                    <div
                      key={f}
                      className="rounded-xl bg-zinc-100 border border-zinc-200 p-3"
                    >
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/business"
                  className="mt-2 inline-flex items-center gap-2 font-semibold text-emerald-600 text-sm"
                >
                  Get started with Business →
                </Link>
              </div>
            </section>

            {/* Pricing */}
            <section
              id="pricing"
              className="marketing-deferred flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-2">
                <h2 className="font-bold text-3xl leading-9 tracking-tight">
                  Simple pricing
                </h2>
                <p className="text-[#71717b] text-sm leading-5">
                  Start free and upgrade when your team needs more power.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Free */}
                <div className="shadow-sm rounded-3xl bg-white border border-zinc-200 p-6 gap-4 flex flex-col">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-xl leading-7">Free</h3>
                      <span className="font-semibold rounded-full bg-zinc-100 text-zinc-950 text-xs leading-4 px-3 py-1">
                        Starter
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-black text-4xl leading-10">$0</span>
                      <span className="text-[#71717b] text-sm leading-5 pb-1">
                        /month
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { ok: true, label: "3 documents" },
                      { ok: true, label: "5 questions/day" },
                      { ok: true, label: "Unlimited conversations" },
                      { ok: false, label: "Advanced citations" },
                      { ok: false, label: "Cross-document comparison" },
                    ].map(({ ok, label }) => (
                      <div
                        key={label}
                        className={`text-sm leading-5 flex items-center gap-3 ${!ok ? "text-[#71717b]" : ""}`}
                      >
                        {ok ? (
                          <Check className="size-4 text-theme-primary" />
                        ) : (
                          <X className="size-4 text-[#71717b]" />
                        )}
                        {label}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/signup"
                    className="mt-auto font-semibold rounded-full bg-zinc-100 text-zinc-800 text-sm text-center px-6 py-3"
                  >
                    Get Started Free
                  </Link>
                </div>

                {/* Pro */}
                <div className="shadow-sm rounded-3xl bg-theme-primary text-theme-primary-foreground border border-zinc-200 p-6 gap-4 flex flex-col">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-xl leading-7">Pro</h3>
                      <span className="font-semibold rounded-full bg-theme-primary-foreground/15 text-xs leading-4 px-3 py-1">
                        Most Popular
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-black text-4xl leading-10">
                        $29
                      </span>
                      <span className="text-theme-primary-foreground/80 text-sm leading-5 pb-1">
                        /month
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      "30 documents",
                      "30 questions/day",
                      "Unlimited conversations",
                      "Priority processing",
                      "Cross-document comparison",
                    ].map((f) => (
                      <div
                        key={f}
                        className="text-sm leading-5 flex items-center gap-3"
                      >
                        <Check className="size-4" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/signup"
                    className="mt-auto font-semibold rounded-full bg-white text-theme-primary text-sm text-center px-6 py-3"
                  >
                    Upgrade to Pro
                  </Link>
                </div>

                {/* Premium */}
                <div className="shadow-sm rounded-3xl bg-white border-2 border-theme-primary p-6 gap-4 flex flex-col">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-xl leading-7">Premium</h3>
                      <span className="font-semibold rounded-full bg-theme-soft text-theme-soft-foreground text-xs leading-4 px-3 py-1">
                        Maximum Power
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-black text-4xl leading-10">$49</span>
                      <span className="text-[#71717b] text-sm leading-5 pb-1">/month</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      "100 documents",
                      "100 questions/day",
                      "Unlimited conversations",
                      "Priority processing",
                      "Cross-document comparison",
                    ].map((f) => (
                      <div key={f} className="text-sm leading-5 flex items-center gap-3">
                        <Check className="size-4 text-theme-primary" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/signup"
                    className="mt-auto font-semibold rounded-full bg-theme-primary text-white text-sm text-center px-6 py-3"
                  >
                    Get Premium
                  </Link>
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="mt-8 flex flex-col items-center gap-5 rounded-2xl border border-zinc-200 bg-white px-5 py-5 text-center shadow-sm sm:mt-10 sm:px-6 lg:flex-row lg:justify-between lg:text-left">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-theme-primary text-theme-primary-foreground flex justify-center items-center">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="leading-none flex flex-col">
                <span className="font-semibold text-sm leading-5">
                  HelpexAI
                </span>
                <span className="text-[#71717b] text-xs leading-4">
                  Document Intelligence Platform
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm leading-5 text-[#71717b]">
              <Link href="/legal">Legal</Link>
              <Link href="/business">Business</Link>
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
            <p className="text-[#71717b] text-sm leading-5">
              © 2026 HelpexAI. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
