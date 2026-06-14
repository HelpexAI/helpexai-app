-- ============================================================
-- Reports: link generated report to generated knowledge document
-- ============================================================

alter table public.reports
  add column if not exists generated_document_id uuid references public.documents(id) on delete set null;

create index if not exists reports_generated_document_id_idx
  on public.reports(generated_document_id);


-- ============================================================
-- Ensure Report tag exists
-- ============================================================

insert into public.tags (
  category_slug,
  name,
  description,
  ai_context,
  color,
  sort_order
)
values (
  'business',
  'Report',
  'A generated or uploaded business report.',
  'Document type: report. This is a generated business report created from selected knowledge-base documents. Treat it as a synthesized report, not as an original source document.',
  'violet',
  45
)
on conflict (category_slug, name) do update
set
  description = excluded.description,
  ai_context = excluded.ai_context,
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();