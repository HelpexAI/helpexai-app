-- Organize documents with one collection and multiple reusable tags.

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ai_context TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'folder',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_slug, name)
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ai_context TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'slate',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_slug, name)
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id);

CREATE TABLE IF NOT EXISTS document_tag_assignments (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(document_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_category_active ON collections(category_slug, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_tags_category_active ON tags(category_slug, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_assignments_tag ON document_tag_assignments(tag_id);

DROP TRIGGER IF EXISTS collections_updated_at ON collections;
CREATE TRIGGER collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS tags_updated_at ON tags;
CREATE TRIGGER tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO collections (category_slug, name, description, ai_context, icon, sort_order)
VALUES
  ('business', 'General', 'Business documents that do not belong to a specialized collection.', 'General business reference material. Infer the document purpose carefully from its contents and assigned tags.', 'folder', 0),
  ('business', 'Contracts & Agreements', 'Vendor, customer, service, employment, and commercial agreements.', 'Treat these documents as agreements. Focus on parties, obligations, pricing, renewal, termination, liability, dates, and commercial risk.', 'file-signature', 10),
  ('business', 'Invoices & Finance', 'Invoices, receipts, purchase orders, statements, and financial records.', 'Treat these as financial records. Focus on amounts, currencies, line items, taxes, payment terms, discrepancies, approvals, and reconciliation.', 'receipt', 20),
  ('business', 'Policies & Procedures', 'Internal policies, procedures, handbooks, and operating instructions.', 'Treat these as internal operating rules. Focus on responsibilities, required steps, exceptions, controls, and compliance.', 'clipboard-list', 30),
  ('business', 'Reports & Proposals', 'Business reports, proposals, plans, and presentations.', 'Treat these as business analysis or proposed work. Focus on claims, assumptions, scope, metrics, deliverables, timelines, and decisions.', 'chart-no-axes-column', 40)
ON CONFLICT (category_slug, name) DO UPDATE SET
  description = EXCLUDED.description, ai_context = EXCLUDED.ai_context,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO tags (category_slug, name, description, ai_context, color, sort_order)
VALUES
  ('business', 'Contract', 'A binding or proposed agreement.', 'Document type: contract or agreement.', 'blue', 10),
  ('business', 'Invoice', 'A bill requesting payment.', 'Document type: invoice. Verify totals, line items, dates, and payment terms.', 'emerald', 20),
  ('business', 'Purchase Order', 'An order authorizing a purchase.', 'Document type: purchase order. Verify quantities, prices, supplier, and approval details.', 'violet', 30),
  ('business', 'Policy', 'An internal or external policy.', 'Document type: policy. Identify rules, responsibilities, exceptions, and enforcement.', 'amber', 40),
  ('business', 'Financial Report', 'A financial statement or performance report.', 'Document type: financial report. Preserve periods, currencies, totals, and assumptions.', 'emerald', 50),
  ('business', 'Proposal', 'A commercial or project proposal.', 'Document type: proposal. Identify scope, deliverables, pricing, assumptions, and validity period.', 'cyan', 60),
  ('business', 'Receipt', 'Evidence of a completed payment.', 'Document type: receipt. Verify merchant, date, items, taxes, and paid amount.', 'slate', 70),
  ('business', 'Vendor', 'Related to a supplier or service provider.', 'Relationship context: vendor or supplier.', 'orange', 80),
  ('business', 'Customer', 'Related to a customer or client.', 'Relationship context: customer or client.', 'pink', 90),
  ('business', 'Internal', 'For internal company use.', 'Audience context: internal company document.', 'slate', 100),
  ('business', 'Compliance', 'Related to regulatory or policy compliance.', 'Review context: compliance-sensitive document.', 'red', 110)
ON CONFLICT (category_slug, name) DO UPDATE SET
  description = EXCLUDED.description, ai_context = EXCLUDED.ai_context,
  color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE FUNCTION seed_default_document_taxonomy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO collections (category_slug, name, description, ai_context, icon, sort_order)
  VALUES
    (NEW.slug, 'General', 'Documents that do not belong to a specialized collection.', 'General reference material. Infer purpose carefully from contents and tags.', 'folder', 0),
    (NEW.slug, 'Contracts & Agreements', 'Contracts and formal agreements.', 'Focus on parties, obligations, pricing, dates, renewal, termination, and risk.', 'file-signature', 10),
    (NEW.slug, 'Financial Documents', 'Invoices, receipts, statements, and financial records.', 'Focus on amounts, currencies, line items, dates, totals, and reconciliation.', 'receipt', 20),
    (NEW.slug, 'Policies & Procedures', 'Policies, procedures, and operating instructions.', 'Focus on responsibilities, required steps, exceptions, controls, and compliance.', 'clipboard-list', 30),
    (NEW.slug, 'Reports & Proposals', 'Reports, proposals, plans, and presentations.', 'Focus on claims, assumptions, scope, metrics, deliverables, and timelines.', 'chart-no-axes-column', 40)
  ON CONFLICT (category_slug, name) DO NOTHING;

  INSERT INTO tags (category_slug, name, description, ai_context, color, sort_order)
  VALUES
    (NEW.slug, 'Contract', 'A binding or proposed agreement.', 'Document type: contract or agreement.', 'blue', 10),
    (NEW.slug, 'Invoice', 'A bill requesting payment.', 'Document type: invoice.', 'emerald', 20),
    (NEW.slug, 'Policy', 'A policy document.', 'Document type: policy.', 'amber', 30),
    (NEW.slug, 'Report', 'A report or analysis.', 'Document type: report.', 'violet', 40),
    (NEW.slug, 'Proposal', 'A proposal for work or services.', 'Document type: proposal.', 'cyan', 50),
    (NEW.slug, 'Internal', 'For internal use.', 'Audience context: internal document.', 'slate', 60),
    (NEW.slug, 'External', 'Received from or shared with an outside party.', 'Audience context: external document.', 'orange', 70),
    (NEW.slug, 'Compliance', 'Compliance-sensitive material.', 'Review context: compliance-sensitive document.', 'red', 80)
  ON CONFLICT (category_slug, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_seed_default_document_taxonomy ON categories;
CREATE TRIGGER categories_seed_default_document_taxonomy
  AFTER INSERT ON categories
  FOR EACH ROW EXECUTE FUNCTION seed_default_document_taxonomy();

INSERT INTO collections (category_slug, name, description, ai_context, icon, sort_order)
SELECT slug, 'General', 'Documents that do not belong to a specialized collection.',
  'General reference material. Infer purpose carefully from contents and tags.', 'folder', 0
FROM categories
ON CONFLICT (category_slug, name) DO NOTHING;

UPDATE documents AS document
SET collection_id = collection.id
FROM collections AS collection
WHERE document.collection_id IS NULL
  AND collection.category_slug = document.category_slug
  AND collection.name = 'General';

ALTER TABLE documents ALTER COLUMN collection_id SET NOT NULL;

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tag_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON collections, tags, document_tag_assignments FROM anon, authenticated;
GRANT SELECT ON collections, tags, document_tag_assignments TO authenticated;

DROP POLICY IF EXISTS "Users can view active collections" ON collections;
CREATE POLICY "Users can view active collections" ON collections FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Users can view active tags" ON tags;
CREATE POLICY "Users can view active tags" ON tags FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Users can view own document tags" ON document_tag_assignments;
CREATE POLICY "Users can view own document tags" ON document_tag_assignments FOR SELECT
USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION reserve_document_uploads(p_user_id UUID, p_category_slug TEXT, p_documents JSONB)
RETURNS TABLE(allowed BOOLEAN, used INTEGER, quota_limit INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_limit INTEGER; v_used INTEGER; v_requested INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_category_slug || ':documents', 0));
  SELECT plan INTO v_plan FROM accounts WHERE user_id = p_user_id AND category_slug = p_category_slug;
  SELECT max_documents INTO v_limit FROM plans WHERE slug = COALESCE(v_plan, 'free') AND category_slug = p_category_slug;
  SELECT COUNT(*)::INTEGER INTO v_used FROM documents WHERE user_id = p_user_id AND category_slug = p_category_slug;
  v_requested := jsonb_array_length(p_documents);
  IF v_used + v_requested > COALESCE(v_limit, 3) THEN RETURN QUERY SELECT false, v_used, COALESCE(v_limit, 3); RETURN; END IF;
  INSERT INTO documents(id, user_id, category_slug, collection_id, name, file_path, file_size, file_type, status)
  SELECT (item->>'id')::UUID, p_user_id, p_category_slug, (item->>'collection_id')::UUID,
    item->>'name', item->>'file_path', (item->>'file_size')::INTEGER, item->>'file_type', 'uploading'
  FROM jsonb_array_elements(p_documents) AS item;
  RETURN QUERY SELECT true, v_used + v_requested, COALESCE(v_limit, 3);
END; $$;

REVOKE ALL ON FUNCTION reserve_document_uploads(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_document_uploads(UUID, TEXT, JSONB) TO service_role;
