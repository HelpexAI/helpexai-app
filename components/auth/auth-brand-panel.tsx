import Link from "next/link";
import {
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const benefits = [
  {
    icon: CheckCircle2,
    title: "Instant document intelligence",
    description: "Ask questions and get precise answers from your files",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description: "Your documents remain isolated and protected",
  },
  {
    icon: Sparkles,
    title: "Category-aware AI",
    description: "Built for legal analysis and business insights",
  },
];

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#0a1628] p-8 text-white lg:flex lg:w-[42%] lg:p-12 xl:w-[40%]">
      <div className="absolute -left-32 top-1/3 size-80 rounded-full border border-blue-400/10" />
      <div className="absolute -left-16 top-1/3 size-80 rounded-full border border-blue-400/10" />
      <div className="relative z-10 flex w-full flex-col">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#2b7fff] text-blue-50 shadow-lg shadow-blue-950/20">
            <LayoutDashboard className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold leading-6 tracking-tight">
              HelpexAI
            </span>
            <span className="text-xs text-slate-400">
              Document Intelligence Platform
            </span>
          </div>
        </Link>

        <div className="my-auto flex max-w-md flex-col gap-7 py-12">
          <div className="h-1 w-12 rounded-full bg-[#2b7fff]" />
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">
              Turn your documents into your smartest advisor
            </h2>
            <p className="text-base leading-7 text-slate-300">
              Upload private documents and receive clear, cited answers from an
              AI expert built for your work.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                  <Icon className="size-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          &copy; 2026 HelpexAI. All rights reserved.
        </p>
      </div>
    </aside>
  );
}
