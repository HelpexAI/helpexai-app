import { ReportRevisionPreview } from "@/components/reports/report-revision-preview";

type PageProps = { params: Promise<{ id: string }> };

export default async function ReportPreviewPage({ params }: PageProps) {
  const { id } = await params;
  return <ReportRevisionPreview reportId={id} />;
}
