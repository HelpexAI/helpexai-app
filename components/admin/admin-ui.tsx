import { formatDate, formatFileSize } from "@/lib/utils";
import Link from "next/link";

export function AdminPageHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p></div>{children}
  </div>;
}

export function MetricCard({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
    <p className="mt-2 text-2xl font-black">{value}</p>{detail && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}
  </article>;
}

export function StatusBadge({ value }: { value?: string | null }) {
  const text = value || "unknown";
  const good = ["ready", "active", "healthy", "completed", "finalized", "configured", "passed"].includes(text);
  const warn = ["warning", "needs review", "partial"].includes(text);
  const bad = ["failed", "error", "past_due", "degraded", "not configured", "blocked"].includes(text);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${good ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : warn ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : bad ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>{text.replaceAll("_", " ")}</span>;
}

export function AdminTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{rows.length ? rows.map((row, index) => <tr key={index} className="align-top">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3.5">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-zinc-500">No records found.</td></tr>}</tbody></table>
  </div>;
}

export function SearchForm({ value = "", placeholder = "Search..." }: { value?: string; placeholder?: string }) {
  return <form className="flex gap-2"><input name="q" defaultValue={value} placeholder={placeholder} className="h-10 w-64 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900" /><button className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white">Search</button></form>;
}

export function Pagination({ page, total, pageSize, basePath, query = "" }: { page: number; total: number; pageSize: number; basePath: string; query?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (next: number) => `${basePath}?page=${next}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  return <div className="flex items-center justify-between text-sm text-zinc-500"><span>Page {page} of {pages} · {total} records</span><div className="flex gap-2"><Link aria-disabled={page <= 1} className="rounded-lg border px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40" href={href(page - 1)}>Previous</Link><Link aria-disabled={page >= pages} className="rounded-lg border px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-40" href={href(page + 1)}>Next</Link></div></div>;
}

export function DateCell({ value }: { value?: string | null }) { return <span className="whitespace-nowrap text-zinc-500">{value ? formatDate(value) : "—"}</span>; }
export function Bytes({ value }: { value: number }) { return <>{formatFileSize(value)}</>; }
export function MoneyMicros({ value }: { value: number }) { return <>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(value / 1_000_000)}</>; }
