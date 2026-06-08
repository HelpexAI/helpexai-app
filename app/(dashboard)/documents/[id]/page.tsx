import { DocumentViewerClientPage } from "@/components/documents/document-viewer-client-page";

export default async function DocumentViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; highlight?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Number.parseInt(query.page ?? "", 10);
  return (
    <DocumentViewerClientPage
      id={id}
      initialPage={Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1}
      highlightExcerpt={query.highlight?.trim() || null}
    />
  );
}
