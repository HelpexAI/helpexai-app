import type { LucideIcon } from "lucide-react";

export function DashboardPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex size-12 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
          <Icon className="size-6" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-zinc-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}
