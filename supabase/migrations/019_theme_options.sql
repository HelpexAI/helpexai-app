-- Theme options and per-workspace dashboard theme selection.

CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL,
  primary_hover_color TEXT NOT NULL,
  primary_foreground_color TEXT NOT NULL,
  soft_color TEXT NOT NULL,
  soft_dark_color TEXT NOT NULL,
  soft_foreground_color TEXT NOT NULL,
  soft_foreground_dark_color TEXT NOT NULL,
  border_color TEXT NOT NULL,
  border_dark_color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS dashboard_theme_id UUID REFERENCES themes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_themes_active_sort ON themes(is_active, sort_order, name);

DROP TRIGGER IF EXISTS themes_updated_at ON themes;
CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO themes (
  slug, name, description,
  primary_color, primary_hover_color, primary_foreground_color,
  soft_color, soft_dark_color, soft_foreground_color, soft_foreground_dark_color,
  border_color, border_dark_color, sort_order
)
VALUES
  (
    'emerald',
    'Emerald',
    'Balanced green theme that feels modern and calm.',
    '16 185 129', '5 150 105', '255 255 255',
    '236 253 245', '2 44 34', '5 150 105', '52 211 153',
    '167 243 208', '6 78 59', 10
  ),
  (
    'blue',
    'Blue',
    'Professional blue theme for crisp dashboard clarity.',
    '59 130 246', '37 99 235', '255 255 255',
    '239 246 255', '15 23 42', '37 99 235', '96 165 250',
    '191 219 254', '30 64 175', 20
  ),
  (
    'slate',
    'Slate',
    'Neutral slate theme for a restrained, minimal look.',
    '71 85 105', '51 65 85', '255 255 255',
    '241 245 249', '15 23 42', '71 85 105', '148 163 184',
    '203 213 225', '30 41 59', 30
  ),
  (
    'gray-light',
    'Gray Light',
    'Soft gray theme with a clean editorial feel.',
    '100 116 139', '71 85 105', '255 255 255',
    '248 250 252', '15 23 42', '71 85 105', '148 163 184',
    '226 232 240', '51 65 85', 40
  ),
  (
    'violet',
    'Violet',
    'Confident violet theme for a premium dashboard feel.',
    '139 92 246', '124 58 237', '255 255 255',
    '245 243 255', '24 24 27', '124 58 237', '196 181 253',
    '221 214 254', '76 29 149', 50
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  primary_color = EXCLUDED.primary_color,
  primary_hover_color = EXCLUDED.primary_hover_color,
  primary_foreground_color = EXCLUDED.primary_foreground_color,
  soft_color = EXCLUDED.soft_color,
  soft_dark_color = EXCLUDED.soft_dark_color,
  soft_foreground_color = EXCLUDED.soft_foreground_color,
  soft_foreground_dark_color = EXCLUDED.soft_foreground_dark_color,
  border_color = EXCLUDED.border_color,
  border_dark_color = EXCLUDED.border_dark_color,
  sort_order = EXCLUDED.sort_order;

UPDATE accounts
SET dashboard_theme_id = themes.id
FROM themes
WHERE accounts.dashboard_theme_id IS NULL
  AND themes.slug = 'emerald';

CREATE OR REPLACE FUNCTION seed_default_workspace_theme()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dashboard_theme_id IS NULL THEN
    SELECT id INTO NEW.dashboard_theme_id
    FROM themes
    WHERE slug = 'emerald'
      AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_seed_default_workspace_theme ON accounts;
CREATE TRIGGER accounts_seed_default_workspace_theme
  BEFORE INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION seed_default_workspace_theme();

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view active themes" ON themes;
CREATE POLICY "Users can view active themes" ON themes FOR SELECT USING (is_active = true);

REVOKE ALL ON themes FROM anon, authenticated;
GRANT SELECT ON themes TO authenticated;
