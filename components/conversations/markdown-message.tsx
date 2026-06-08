"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="min-w-0 overflow-x-auto text-sm leading-6 text-zinc-800 dark:text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-bold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-bold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 font-bold first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="pl-1 marker:text-theme-primary">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-theme-primary bg-theme-soft px-3 py-2 text-zinc-600 dark:bg-theme-soft-dark dark:text-zinc-300">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-zinc-950 dark:text-white">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-theme-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const block = Boolean(className);
            return block ? (
              <code className={`${className ?? ""} block min-w-max text-xs leading-5 text-zinc-100`}>{children}</code>
            ) : (
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-950 p-3">{children}</pre>,
          hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-700" />,
          table: ({ children }) => <table className="my-3 min-w-full border-collapse text-left text-xs">{children}</table>,
          thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-800">{children}</thead>,
          th: ({ children }) => <th className="border border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-700">{children}</th>,
          td: ({ children }) => <td className="border border-zinc-200 px-3 py-2 align-top dark:border-zinc-700">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
