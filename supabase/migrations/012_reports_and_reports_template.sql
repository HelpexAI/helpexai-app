-- ============================================================
-- HelpexAI Reports Module Foundation
-- ============================================================
-- Creates:
-- 1. report_templates
-- 2. reports
-- 3. report_sources
-- 4. indexes
-- 5. updated_at triggers
-- 6. RLS policies
-- 7. default business report templates
-- ============================================================


-- ============================================================
-- Updated timestamp helper
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- Report Templates
-- ============================================================

create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),

  category_slug text not null default 'business',

  slug text not null,
  name text not null,
  description text,
  icon text,

  type text not null default 'business'
    check (type in ('business', 'legal', 'financial', 'operations', 'custom')),

  goal text not null,
  system_prompt text not null,
  user_prompt_template text not null,

  required_sections jsonb not null default '[]'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  writing_style jsonb not null default '{}'::jsonb,

  model text,
  temperature numeric(3,2) default 0.30,
  max_documents integer default 20,
  max_context_chunks integer default 40,

  visibility text not null default 'public'
    check (visibility in ('public', 'admin', 'private')),

  status text not null default 'active'
    check (status in ('draft', 'active', 'archived')),

  min_plan text not null default 'free'
    check (min_plan in ('free', 'pro', 'premium')),

  sort_order integer not null default 0,

  created_by uuid references auth.users(id) on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(category_slug, slug)
);


-- ============================================================
-- Reports
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,

  category_slug text not null default 'business',

  title text not null,
  prompt text not null,

  template_id uuid references public.report_templates(id) on delete set null,
  template_slug text,
  template_snapshot jsonb not null default '{}'::jsonb,

  content text,
  content_format text not null default 'markdown',

  status text not null default 'draft'
    check (status in ('draft', 'generating', 'completed', 'failed')),

  source_type text not null default 'documents'
    check (source_type in ('documents', 'collection', 'mixed')),

  collection_id uuid,

  model text,
  error_message text,

  metadata jsonb not null default '{}'::jsonb,

  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Safe upgrade if reports table already exists
alter table public.reports
  add column if not exists template_id uuid references public.report_templates(id) on delete set null;

alter table public.reports
  add column if not exists template_slug text;

alter table public.reports
  add column if not exists template_snapshot jsonb not null default '{}'::jsonb;


-- ============================================================
-- Report Source Documents
-- ============================================================

create table if not exists public.report_sources (
  id uuid primary key default gen_random_uuid(),

  report_id uuid not null references public.reports(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique(report_id, document_id)
);


-- ============================================================
-- Indexes
-- ============================================================

create index if not exists report_templates_category_slug_idx
  on public.report_templates(category_slug);

create index if not exists report_templates_status_idx
  on public.report_templates(status);

create index if not exists report_templates_visibility_idx
  on public.report_templates(visibility);

create index if not exists report_templates_sort_order_idx
  on public.report_templates(sort_order);

create index if not exists reports_user_id_idx
  on public.reports(user_id);

create index if not exists reports_account_id_idx
  on public.reports(account_id);

create index if not exists reports_category_slug_idx
  on public.reports(category_slug);

create index if not exists reports_status_idx
  on public.reports(status);

create index if not exists reports_template_id_idx
  on public.reports(template_id);

create index if not exists report_sources_report_id_idx
  on public.report_sources(report_id);

create index if not exists report_sources_document_id_idx
  on public.report_sources(document_id);


-- ============================================================
-- Triggers
-- ============================================================

drop trigger if exists set_report_templates_updated_at
on public.report_templates;

create trigger set_report_templates_updated_at
before update on public.report_templates
for each row
execute function public.set_updated_at();


drop trigger if exists set_reports_updated_at
on public.reports;

create trigger set_reports_updated_at
before update on public.reports
for each row
execute function public.set_updated_at();


-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.report_templates enable row level security;
alter table public.reports enable row level security;
alter table public.report_sources enable row level security;


-- ============================================================
-- RLS Policies: report_templates
-- ============================================================

drop policy if exists "Users can view active public report templates"
on public.report_templates;

create policy "Users can view active public report templates"
on public.report_templates
for select
using (
  status = 'active'
  and visibility = 'public'
);


-- ============================================================
-- RLS Policies: reports
-- ============================================================

drop policy if exists "Users can view their own reports"
on public.reports;

create policy "Users can view their own reports"
on public.reports
for select
using (auth.uid() = user_id);


drop policy if exists "Users can create their own reports"
on public.reports;

create policy "Users can create their own reports"
on public.reports
for insert
with check (auth.uid() = user_id);


drop policy if exists "Users can update their own reports"
on public.reports;

create policy "Users can update their own reports"
on public.reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


drop policy if exists "Users can delete their own reports"
on public.reports;

create policy "Users can delete their own reports"
on public.reports
for delete
using (auth.uid() = user_id);


-- ============================================================
-- RLS Policies: report_sources
-- ============================================================

drop policy if exists "Users can view report sources for their reports"
on public.report_sources;

create policy "Users can view report sources for their reports"
on public.report_sources
for select
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_sources.report_id
      and r.user_id = auth.uid()
  )
);


drop policy if exists "Users can insert report sources for their reports"
on public.report_sources;

create policy "Users can insert report sources for their reports"
on public.report_sources
for insert
with check (
  exists (
    select 1
    from public.reports r
    where r.id = report_sources.report_id
      and r.user_id = auth.uid()
  )
);


drop policy if exists "Users can delete report sources for their reports"
on public.report_sources;

create policy "Users can delete report sources for their reports"
on public.report_sources
for delete
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_sources.report_id
      and r.user_id = auth.uid()
  )
);


-- ============================================================
-- Seed Default Business Report Templates
-- ============================================================

insert into public.report_templates (
  category_slug,
  slug,
  name,
  description,
  icon,
  type,
  goal,
  system_prompt,
  user_prompt_template,
  required_sections,
  output_schema,
  writing_style,
  min_plan,
  sort_order
)
values
(
  'business',
  'executive-summary',
  'Executive Summary',
  'Create a concise leadership-level summary from selected business documents.',
  'briefcase',
  'business',
  'Generate a clear executive summary that highlights the most important business information, decisions, risks, and recommended next steps.',
  'You are a senior business analyst. You write clear, structured, professional reports for founders, managers, and business decision makers. Use only the provided document context. Do not invent facts. If information is missing, clearly mention it.',
  'Create an executive summary from the selected documents.

Focus on:
- Key facts
- Important business insights
- Decisions or actions mentioned
- Risks or concerns
- Recommended next steps

User instruction:
{{custom_prompt}}

Document context:
{{context}}',
  '[
    "Executive Summary",
    "Key Findings",
    "Risks and Concerns",
    "Recommended Next Steps"
  ]'::jsonb,
  '{}'::jsonb,
  '{
    "tone": "professional",
    "length": "medium",
    "format": "markdown",
    "use_bullets": true,
    "avoid_hallucination": true
  }'::jsonb,
  'free',
  10
),
(
  'business',
  'risk-analysis',
  'Risk Analysis Report',
  'Identify operational, financial, legal, or strategic risks from selected documents.',
  'shield-alert',
  'business',
  'Analyze selected documents and produce a practical risk report with severity, evidence, and mitigation suggestions.',
  'You are a business risk analyst. Your job is to identify risks from internal business documents. Use only the provided context. Separate confirmed risks from possible risks. Do not exaggerate or invent issues.',
  'Create a risk analysis report from the selected documents.

Include:
- Risk title
- Risk category
- Severity: Low, Medium, or High
- Evidence from the documents
- Potential impact
- Suggested mitigation

User instruction:
{{custom_prompt}}

Document context:
{{context}}',
  '[
    "Overview",
    "High Priority Risks",
    "Medium Priority Risks",
    "Low Priority Risks",
    "Suggested Mitigations"
  ]'::jsonb,
  '{}'::jsonb,
  '{
    "tone": "professional",
    "length": "detailed",
    "format": "markdown",
    "use_tables": true,
    "avoid_hallucination": true
  }'::jsonb,
  'pro',
  20
),
(
  'business',
  'document-insights',
  'Document Insights Report',
  'Extract useful insights, patterns, gaps, and action items from selected documents.',
  'file-search',
  'business',
  'Turn selected business documents into useful insights, action items, and missing-information notes.',
  'You are an AI business assistant. You analyze internal documents and produce useful, practical insights. Keep the report grounded in the provided context. Mention uncertainty where needed.',
  'Generate a document insights report.

Include:
- Main topics found
- Important facts
- Patterns or repeated themes
- Gaps or missing information
- Action items

User instruction:
{{custom_prompt}}

Document context:
{{context}}',
  '[
    "Main Topics",
    "Important Facts",
    "Insights",
    "Information Gaps",
    "Action Items"
  ]'::jsonb,
  '{}'::jsonb,
  '{
    "tone": "clear",
    "length": "medium",
    "format": "markdown",
    "use_bullets": true,
    "avoid_hallucination": true
  }'::jsonb,
  'free',
  30
)
on conflict (category_slug, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  type = excluded.type,
  goal = excluded.goal,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  required_sections = excluded.required_sections,
  output_schema = excluded.output_schema,
  writing_style = excluded.writing_style,
  min_plan = excluded.min_plan,
  sort_order = excluded.sort_order,
  updated_at = now();