import { DocumentsWorkspaceShell } from "@/components/documents/documents-workspace-shell";
import { Suspense } from "react";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DocumentsWorkspaceShell>{children}</DocumentsWorkspaceShell>
    </Suspense>
  );
}
