"use client";

import {
  archivePlan,
  archiveTheme,
  archiveReportTemplate,
  archiveTaxonomy,
  saveCollection,
  savePlan,
  saveReportTemplate,
  saveTheme,
  saveTag,
} from "@/app/admin/settings/actions";
import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-ui";
import {
  Layers3,
  LayoutList,
  Pencil,
  PencilLine,
  Plus,
  Palette,
  Settings2,
  Tag,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type CSSProperties, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Product = { slug: string; name: string };
type Collection = {
  id: string;
  category_slug: string;
  name: string;
  description: string;
  ai_context: string;
  is_active: boolean;
  icon?: string;
};
type TagRecord = {
  id: string;
  category_slug: string;
  name: string;
  description: string;
  ai_context: string;
  is_active: boolean;
  color?: string;
};
type ReportTemplate = {
  id: string;
  category_slug: string;
  slug: string;
  name: string;
  description: string;
  icon?: string | null;
  type: string;
  goal: string;
  system_prompt: string;
  user_prompt_template: string;
  visibility: string;
  status: string;
  min_plan: string;
  sort_order: number;
  model?: string | null;
  temperature?: number | null;
  max_documents?: number | null;
  max_context_chunks?: number | null;
};
type Plan = {
  id: string;
  name: string;
  slug: string;
  category_slug: string;
  price_monthly: number;
  creem_product_id?: string | null;
  max_storage_bytes: number;
  max_queries_day: number;
  max_reports_month: number;
};
type ThemeOption = {
  id: string;
  slug: string;
  name: string;
  description: string;
  primary_color: string;
  primary_hover_color: string;
  primary_foreground_color: string;
  soft_color: string;
  soft_dark_color: string;
  soft_foreground_color: string;
  soft_foreground_dark_color: string;
  border_color: string;
  border_dark_color: string;
  is_active: boolean;
  sort_order: number;
};

type Tab = "categories" | "tags" | "templates" | "plans" | "themes";
type EditorMode = "create" | "edit";

type EditorState =
  | { tab: "categories"; mode: EditorMode; item?: Collection }
  | { tab: "tags"; mode: EditorMode; item?: TagRecord }
  | { tab: "templates"; mode: EditorMode; item?: ReportTemplate }
  | { tab: "plans"; mode: EditorMode; item?: Plan }
  | { tab: "themes"; mode: EditorMode; item?: ThemeOption }
  | null;

type ArchiveState =
  | { tab: "categories"; item: Collection }
  | { tab: "tags"; item: TagRecord }
  | { tab: "templates"; item: ReportTemplate }
  | { tab: "plans"; item: Plan }
  | { tab: "themes"; item: ThemeOption }
  | null;

function Field({
  name,
  defaultValue,
  placeholder,
  required,
  type = "text",
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <input
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      required={required}
      type={type}
      className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950"
    />
  );
}

function Textarea({
  name,
  defaultValue,
  placeholder,
  rows = 4,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      rows={rows}
      className="min-h-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950"
    />
  );
}

function Select({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950"
    >
      {children}
    </select>
  );
}

function ProductSelect({
  products,
  value,
}: {
  products: Product[];
  value?: string;
}) {
  return (
    <Select name="category_slug" defaultValue={value ?? products[0]?.slug ?? ""}>
      {!products.length && <option value="">No products available</option>}
      {products.map((product) => (
        <option key={product.slug} value={product.slug}>
          {product.name}
        </option>
      ))}
    </Select>
  );
}

function SectionHeader({
  title,
  description,
  onCreate,
}: {
  title: string;
  description: string;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-theme-primary-hover"
      >
        <Plus className="size-4" />
        Create
      </button>
    </div>
  );
}

function RowCard({
  title,
  subtitle,
  status,
  children,
  style,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  status?: string;
  children?: ReactNode;
  style?: CSSProperties;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-theme-border hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      style={style}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-950 dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status && <StatusBadge value={status} />}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-theme-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
            title="Edit"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/30"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
        active
          ? "border-theme-border bg-theme-soft font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark"
          : "border-transparent text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function editorTitle(tab: Tab, mode: EditorMode) {
  const item =
    tab === "categories"
      ? "category"
      : tab === "tags"
        ? "tag"
        : tab === "templates"
          ? "report template"
          : tab === "plans"
            ? "plan"
            : "theme";
  return `${mode === "edit" ? "Edit" : "Create"} ${item}`;
}

function archiveTitle(tab: Tab) {
  return tab === "plans"
    ? "Remove payment link?"
    : tab === "templates"
      ? "Archive report template?"
      : tab === "tags"
        ? "Archive tag?"
        : tab === "themes"
          ? "Archive theme?"
          : "Archive category?";
}

export function AdminSettingsPanel({
  products,
  collections,
  tags,
  reportTemplates,
  plans,
  themes,
}: {
  products: Product[];
  collections: Collection[];
  tags: TagRecord[];
  reportTemplates: ReportTemplate[];
  plans: Plan[];
  themes: ThemeOption[];
}) {
  const router = useRouter();
  const tabs = useMemo(
    () => [
      { id: "categories" as Tab, label: "Category", icon: Layers3 },
      { id: "tags" as Tab, label: "Tags", icon: Tag },
      { id: "templates" as Tab, label: "Report templates", icon: LayoutList },
      { id: "plans" as Tab, label: "Plans", icon: PencilLine },
      { id: "themes" as Tab, label: "Themes", icon: Palette },
    ],
    [],
  );

  const [tab, setTab] = useState<Tab>("categories");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [archived, setArchived] = useState<ArchiveState>(null);

  const activeCollections = collections.filter((item) => item.is_active);
  const activeTags = tags.filter((item) => item.is_active);
  const activeTemplates = reportTemplates.filter(
    (item) => item.status !== "archived",
  );

  function openCreate(nextTab: Tab) {
    setEditor({ tab: nextTab, mode: "create" });
  }

  function openEdit(
    nextTab: Tab,
    item: Collection | TagRecord | ReportTemplate | Plan | ThemeOption,
  ) {
    setEditor({ tab: nextTab, mode: "edit", item: item as never });
  }

  function openDelete(
    nextTab: Tab,
    item: Collection | TagRecord | ReportTemplate | Plan | ThemeOption,
  ) {
    setArchived({ tab: nextTab, item: item as never });
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close settings menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col gap-1 overflow-hidden border-r border-zinc-200 bg-white p-3 shadow-xl transition-transform dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Admin settings
          </p>
        </div>
        <nav className="theme-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
          {tabs.map(({ id, label, icon }) => (
            <TabButton
              key={id}
              active={tab === id}
              icon={icon}
              label={label}
              onClick={() => {
                setTab(id);
                setMobileOpen(false);
              }}
            />
          ))}
        </nav>
      </aside>

      <main className="theme-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold shadow-sm dark:border-zinc-700 dark:bg-zinc-900 lg:hidden"
        >
          <Settings2 className="size-4 text-theme-primary" />
          Settings tabs
        </button>

        <AdminPageHeader
          title="Settings"
          description="Manage categories, tags, report templates, and plans from one control surface."
        />

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          {tab === "categories" && (
            <div className="space-y-4">
              <SectionHeader
                title="Categories"
                description="Collections shown in customer document libraries."
                onCreate={() => openCreate("categories")}
              />
              <div className="grid gap-3">
                {activeCollections.map((item) => (
                  <RowCard
                    key={item.id}
                    title={item.name}
                    subtitle={`${item.category_slug} · ${item.description}`}
                    status="active"
                    onEdit={() => openEdit("categories", item)}
                    onDelete={() => openDelete("categories", item)}
                  />
                ))}
                {!activeCollections.length && (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No categories yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "tags" && (
            <div className="space-y-4">
              <SectionHeader
                title="Tags"
                description="Reusable labels that enrich AI context and keep classification consistent."
                onCreate={() => openCreate("tags")}
              />
              <div className="grid gap-3">
                {activeTags.map((item) => (
                  <RowCard
                    key={item.id}
                    title={item.name}
                    subtitle={`${item.category_slug} · ${item.description}`}
                    status="active"
                    onEdit={() => openEdit("tags", item)}
                    onDelete={() => openDelete("tags", item)}
                  />
                ))}
                {!activeTags.length && (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No tags yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "templates" && (
            <div className="space-y-4">
              <SectionHeader
                title="Report templates"
                description="Templates used by the report generator."
                onCreate={() => openCreate("templates")}
              />
              <div className="grid gap-3">
                {activeTemplates.map((item) => (
                  <RowCard
                    key={item.id}
                    title={item.name}
                    subtitle={`${item.category_slug} · ${item.slug} · ${item.type}`}
                    status={item.status}
                    onEdit={() => openEdit("templates", item)}
                    onDelete={() => openDelete("templates", item)}
                  />
                ))}
                {!activeTemplates.length && (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No active report templates.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "plans" && (
            <div className="space-y-4">
              <SectionHeader
                title="Plans"
                description="Billing limits and payment-provider mapping."
                onCreate={() => openCreate("plans")}
              />
              <div className="grid gap-3">
                {plans.map((item) => (
                  <RowCard
                    key={item.id}
                    title={`${item.category_slug} · ${item.name}`}
                    subtitle={`${item.slug} · ${(item.price_monthly / 100).toFixed(2)} / month`}
                    status={
                      item.creem_product_id ? "configured" : "not configured"
                    }
                    onEdit={() => openEdit("plans", item)}
                    onDelete={() => openDelete("plans", item)}
                  />
                ))}
                {!plans.length && (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No plans found.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "themes" && (
            <div className="space-y-4">
              <SectionHeader
                title="Themes"
                description="Professional dashboard palettes available to workspace users."
                onCreate={() => openCreate("themes")}
              />
              <div className="grid gap-3">
                {themes
                  .filter((item) => item.is_active)
                  .map((item) => (
                    <RowCard
                      key={item.id}
                      title={item.name}
                      subtitle={item.description}
                      status={item.is_active ? "active" : "inactive"}
                      onEdit={() => openEdit("themes", item)}
                      onDelete={() => openDelete("themes", item)}
                      style={
                        {
                          "--theme-primary": item.primary_color,
                          "--theme-primary-hover": item.primary_hover_color,
                          "--theme-primary-foreground":
                            item.primary_foreground_color,
                          "--theme-soft": item.soft_color,
                          "--theme-soft-dark": item.soft_dark_color,
                          "--theme-soft-foreground":
                            item.soft_foreground_color,
                          "--theme-soft-foreground-dark":
                            item.soft_foreground_dark_color,
                          "--theme-border": item.border_color,
                          "--theme-border-dark": item.border_dark_color,
                        } as CSSProperties
                      }
                    >
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-theme-primary">
                        {item.slug}
                      </p>
                      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-theme-border dark:border-theme-border-dark">
                        <span className="h-10 bg-theme-primary" />
                        <span className="h-10 bg-theme-soft" />
                        <span className="h-10 bg-white dark:bg-zinc-950" />
                        <span className="h-10 bg-zinc-100 dark:bg-zinc-800" />
                      </div>
                    </RowCard>
                  ))}
                {!themes.filter((item) => item.is_active).length && (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No active themes yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <ResponsiveModal
        open={editor !== null}
        onClose={() => setEditor(null)}
        ariaLabel="Admin settings editor"
      >
        {editor?.tab === "categories" && (
          <form
            action={async (formData) => {
              await saveCollection(formData);
              setEditor(null);
              router.refresh();
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {editorTitle("categories", editor.mode)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Update the taxonomy label used across documents and AI context.
              </p>
            </div>
            <input type="hidden" name="id" value={editor.item?.id ?? ""} />
            <ProductSelect
              products={products}
              value={editor.item?.category_slug}
            />
            <Field
              name="name"
              defaultValue={editor.item?.name}
              placeholder="Category name"
              required
            />
            <Field
              name="icon"
              defaultValue={editor.item?.icon}
              placeholder="Icon key"
            />
            <Textarea
              name="description"
              defaultValue={editor.item?.description}
              placeholder="Description"
              rows={3}
            />
            <Textarea
              name="ai_context"
              defaultValue={editor.item?.ai_context}
              placeholder="AI context"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-800"
              >
                Cancel
              </button>
              <button className="h-10 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white">
                Save category
              </button>
            </div>
          </form>
        )}

        {editor?.tab === "tags" && (
          <form
            action={async (formData) => {
              await saveTag(formData);
              setEditor(null);
              router.refresh();
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {editorTitle("tags", editor.mode)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Tags improve AI classification and future search behavior.
              </p>
            </div>
            <input type="hidden" name="id" value={editor.item?.id ?? ""} />
            <ProductSelect
              products={products}
              value={editor.item?.category_slug}
            />
            <Field
              name="name"
              defaultValue={editor.item?.name}
              placeholder="Tag name"
              required
            />
            <Field
              name="color"
              defaultValue={editor.item?.color}
              placeholder="Color key"
            />
            <Textarea
              name="description"
              defaultValue={editor.item?.description}
              placeholder="Description"
              rows={3}
            />
            <Textarea
              name="ai_context"
              defaultValue={editor.item?.ai_context}
              placeholder="AI context"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-800"
              >
                Cancel
              </button>
              <button className="h-10 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white">
                Save tag
              </button>
            </div>
          </form>
        )}

        {editor?.tab === "templates" && (
          <form
            action={async (formData) => {
              await saveReportTemplate(formData);
              setEditor(null);
              router.refresh();
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {editorTitle("templates", editor.mode)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Templates control report generation structure and prompt behavior.
              </p>
            </div>
            <input type="hidden" name="id" value={editor.item?.id ?? ""} />
            <div className="grid gap-2 sm:grid-cols-2">
              <ProductSelect
                products={products}
                value={editor.item?.category_slug}
              />
              <Field
                name="slug"
                defaultValue={editor.item?.slug}
                placeholder="Template slug"
                required
              />
              <Field
                name="name"
                defaultValue={editor.item?.name}
                placeholder="Template name"
                required
              />
              <Field
                name="type"
                defaultValue={editor.item?.type}
                placeholder="Type"
                required
              />
              <Field
                name="visibility"
                defaultValue={editor.item?.visibility}
                placeholder="Visibility"
                required
              />
              <Field
                name="status"
                defaultValue={editor.item?.status}
                placeholder="Status"
                required
              />
              <Field
                name="min_plan"
                defaultValue={editor.item?.min_plan}
                placeholder="Min plan"
                required
              />
              <Field
                name="sort_order"
                defaultValue={editor.item?.sort_order}
                placeholder="Sort order"
                type="number"
                required
              />
              <Field
                name="icon"
                defaultValue={editor.item?.icon ?? ""}
                placeholder="Icon"
              />
              <Field
                name="model"
                defaultValue={editor.item?.model ?? ""}
                placeholder="Model"
              />
              <Field
                name="temperature"
                defaultValue={editor.item?.temperature ?? 0.3}
                placeholder="Temperature"
                type="number"
              />
              <Field
                name="max_documents"
                defaultValue={editor.item?.max_documents ?? 20}
                placeholder="Max documents"
                type="number"
              />
              <Field
                name="max_context_chunks"
                defaultValue={editor.item?.max_context_chunks ?? 40}
                placeholder="Max chunks"
                type="number"
              />
            </div>
            <Textarea
              name="description"
              defaultValue={editor.item?.description ?? ""}
              placeholder="Description"
              rows={2}
            />
            <Textarea
              name="goal"
              defaultValue={editor.item?.goal}
              placeholder="Goal"
              rows={2}
            />
            <Textarea
              name="system_prompt"
              defaultValue={editor.item?.system_prompt}
              placeholder="System prompt"
              rows={5}
            />
            <Textarea
              name="user_prompt_template"
              defaultValue={editor.item?.user_prompt_template}
              placeholder="User prompt template"
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-800"
              >
                Cancel
              </button>
              <button className="h-10 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white">
                Save template
              </button>
            </div>
          </form>
        )}

        {editor?.tab === "plans" && (
          <form
            action={async (formData) => {
              await savePlan(formData);
              setEditor(null);
              router.refresh();
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {editorTitle("plans", editor.mode)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Update pricing and limits without touching the billing provider.
              </p>
            </div>
            <input type="hidden" name="id" value={editor.item?.id ?? ""} />
            <div className="grid gap-2 sm:grid-cols-2">
              <ProductSelect
                products={products}
                value={editor.item?.category_slug}
              />
              <Select name="slug" defaultValue={editor.item?.slug}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </Select>
              <Field
                name="name"
                defaultValue={editor.item?.name}
                placeholder="Plan name"
                required
              />
              <Field
                name="price_monthly"
                defaultValue={editor.item?.price_monthly}
                placeholder="Price cents"
                type="number"
                required
              />
              <Field
                name="creem_product_id"
                defaultValue={editor.item?.creem_product_id ?? ""}
                placeholder="Creem product ID"
              />
              <Field
                name="max_storage_bytes"
                defaultValue={editor.item?.max_storage_bytes}
                placeholder="Storage bytes"
                type="number"
                required
              />
              <Field
                name="max_queries_day"
                defaultValue={editor.item?.max_queries_day}
                placeholder="Queries/day"
                type="number"
                required
              />
              <Field
                name="max_reports_month"
                defaultValue={editor.item?.max_reports_month}
                placeholder="Reports/month"
                type="number"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-800"
              >
                Cancel
              </button>
              <button className="h-10 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white">
                Save plan
              </button>
            </div>
          </form>
        )}

        {editor?.tab === "themes" && (
          <form
            action={async (formData) => {
              await saveTheme(formData);
              setEditor(null);
              router.refresh();
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {editorTitle("themes", editor.mode)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Manage dashboard palettes shown to workspace users.
              </p>
            </div>
            <input type="hidden" name="id" value={editor.item?.id ?? ""} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                name="slug"
                defaultValue={editor.item?.slug}
                placeholder="Theme slug"
                required
              />
              <Field
                name="name"
                defaultValue={editor.item?.name}
                placeholder="Theme name"
                required
              />
              <Field
                name="sort_order"
                defaultValue={editor.item?.sort_order}
                placeholder="Sort order"
                type="number"
                required
              />
            </div>
            <Textarea
              name="description"
              defaultValue={editor.item?.description}
              placeholder="Description"
              rows={2}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                name="primary_color"
                defaultValue={editor.item?.primary_color}
                placeholder="Primary color (e.g. 16 185 129)"
                required
              />
              <Field
                name="primary_hover_color"
                defaultValue={editor.item?.primary_hover_color}
                placeholder="Primary hover color"
                required
              />
              <Field
                name="primary_foreground_color"
                defaultValue={editor.item?.primary_foreground_color}
                placeholder="Primary foreground color"
                required
              />
              <Field
                name="soft_color"
                defaultValue={editor.item?.soft_color}
                placeholder="Soft color"
                required
              />
              <Field
                name="soft_dark_color"
                defaultValue={editor.item?.soft_dark_color}
                placeholder="Soft dark color"
                required
              />
              <Field
                name="soft_foreground_color"
                defaultValue={editor.item?.soft_foreground_color}
                placeholder="Soft foreground color"
                required
              />
              <Field
                name="soft_foreground_dark_color"
                defaultValue={editor.item?.soft_foreground_dark_color}
                placeholder="Soft foreground dark color"
                required
              />
              <Field
                name="border_color"
                defaultValue={editor.item?.border_color}
                placeholder="Border color"
                required
              />
              <Field
                name="border_dark_color"
                defaultValue={editor.item?.border_dark_color}
                placeholder="Border dark color"
                required
              />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              Colors use RGB triplets like <span className="font-semibold">16 185 129</span>.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-800"
              >
                Cancel
              </button>
              <button className="h-10 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white">
                Save theme
              </button>
            </div>
          </form>
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={archived !== null}
        onClose={() => setArchived(null)}
        ariaLabel="Confirm archive"
      >
        {archived && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {archiveTitle(archived.tab)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                This removes the item from active use while keeping history
                intact.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
              <p className="font-semibold">{archived.item.name}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {archived.tab === "themes"
                  ? archived.item.slug
                  : archived.item.category_slug}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchived(null)}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-800"
              >
                Cancel
              </button>
              <form
                action={async (formData) => {
                  if (archived.tab === "categories" || archived.tab === "tags") {
                    await archiveTaxonomy(formData);
                  } else if (archived.tab === "templates") {
                    await archiveReportTemplate(formData);
                  } else if (archived.tab === "themes") {
                    await archiveTheme(formData);
                  } else {
                    await archivePlan(formData);
                  }
                  setArchived(null);
                  router.refresh();
                }}
              >
                <input type="hidden" name="id" value={archived.item.id} />
                <input
                  type="hidden"
                  name="type"
                  value={archived.tab === "categories" ? "collection" : archived.tab === "tags" ? "tag" : ""}
                />
                <button className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white">
                  {archived.tab === "plans" ? "Remove link" : archived.tab === "themes" ? "Archive theme" : "Archive"}
                </button>
              </form>
            </div>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
}
