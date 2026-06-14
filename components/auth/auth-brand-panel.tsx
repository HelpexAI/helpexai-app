import Link from "next/link";
import {
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
} from "lucide-react";

const benefits = [
  {
    icon: Database,
    title: "Business Knowledge Base",
    description:
      "Organize contracts, policies, SOPs, reports, invoices, and company documents into a searchable AI workspace.",
  },
  {
    icon: MessageSquareText,
    title: "Source-Backed Conversations",
    description:
      "Ask questions across selected documents or your entire business knowledge base with cited answers.",
  },
  {
    icon: FileText,
    title: "AI Reports",
    description:
      "Generate business summaries, risk reports, action items, and decision briefs from your documents.",
  },
];

export function AuthBrandPanel({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#0a1628] p-8 text-white lg:flex lg:w-[42%] lg:p-12 xl:w-[40%]">
      <div className="absolute -left-32 top-1/3 size-80 rounded-full border border-theme-primary/10" />
      <div className="absolute -left-16 top-1/3 size-80 rounded-full border border-theme-primary/10" />

      <div className="relative z-10 flex w-full flex-col">
        <Link href={homeHref} className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-theme-primary text-theme-primary-foreground shadow-lg shadow-black/20">
            <LayoutDashboard className="size-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-xl font-bold leading-6 tracking-tight">
              HelpexAI
            </span>

            <span className="text-xs text-slate-400">
              AI Business Knowledge Workspace
            </span>
          </div>
        </Link>

        <div className="my-auto flex max-w-md flex-col gap-7 py-6">
          <div className="h-1 w-12 rounded-full bg-theme-primary" />

          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-tight">
              Turn business documents into knowledge, reports, and decisions
            </h2>

            <p className="text-base leading-7 text-slate-300">
              Upload contracts, policies, SOPs, reports, invoices, and company
              files. Ask questions, generate reports, and get source-backed
              answers from your business knowledge.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-primary/15">
                  <Icon className="size-4 text-theme-soft-foreground-dark" />
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
      </div>
    </aside>
  );
}
