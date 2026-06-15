"use server";

import { requireAdminAction } from "@/lib/admin/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  category_slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  ai_context: z.string().trim().max(2000),
  icon: z.string().trim().regex(/^[a-z0-9-]+$/).default("folder"),
});

const tagSchema = z.object({
  id: z.string().uuid().optional(),
  category_slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500),
  ai_context: z.string().trim().max(1000),
  color: z.string().trim().regex(/^[a-z0-9-]+$/).default("slate"),
});

const reportTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  category_slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  slug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  icon: z.string().trim().max(80).optional().or(z.literal("")),
  type: z.enum(["business", "legal", "financial", "operations", "custom"]),
  goal: z.string().trim().min(2).max(4000),
  system_prompt: z.string().trim().min(2).max(12000),
  user_prompt_template: z.string().trim().min(2).max(12000),
  visibility: z.enum(["public", "admin", "private"]),
  status: z.enum(["draft", "active", "archived"]),
  min_plan: z.enum(["free", "pro", "premium"]),
  sort_order: z.coerce.number().int().min(0).max(1000),
  model: z.string().trim().max(100).optional().or(z.literal("")),
  temperature: z.coerce.number().min(0).max(2).optional(),
  max_documents: z.coerce.number().int().min(1).max(200).optional(),
  max_context_chunks: z.coerce.number().int().min(1).max(500).optional(),
});

const planSchema = z.object({
  id: z.string().uuid().optional(),
  category_slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  slug: z.enum(["free", "pro", "premium"]),
  name: z.string().trim().min(2).max(80),
  price_monthly: z.coerce.number().int().min(0).max(1000000),
  creem_product_id: z.string().trim().max(200).optional().or(z.literal("")),
  max_storage_bytes: z.coerce.number().int().min(0).max(1099511627776),
  max_queries_day: z.coerce.number().int().min(-1).max(1000000),
  max_reports_month: z.coerce.number().int().min(0).max(1000000),
});

const themeSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  primary_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  primary_hover_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  primary_foreground_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  soft_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  soft_dark_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  soft_foreground_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  soft_foreground_dark_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  border_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  border_dark_color: z.string().trim().regex(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/),
  sort_order: z.coerce.number().int().min(0).max(1000),
});

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveCollection(formData: FormData) {
  const { service } = await requireAdminAction();
  const parsed = collectionSchema.parse({
    id: value(formData, "id") || undefined,
    category_slug: value(formData, "category_slug"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    ai_context: value(formData, "ai_context"),
    icon: value(formData, "icon") || "folder",
  });
  const payload = { ...parsed, id: undefined, is_active: true };
  const query = parsed.id
    ? service.from("collections").update(payload).eq("id", parsed.id)
    : service.from("collections").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.code === "23505" ? "A category with this name already exists in the product." : error.message);
  revalidatePath("/admin/settings");
}

export async function saveTag(formData: FormData) {
  const { service } = await requireAdminAction();
  const parsed = tagSchema.parse({
    id: value(formData, "id") || undefined,
    category_slug: value(formData, "category_slug"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    ai_context: value(formData, "ai_context"),
    color: value(formData, "color") || "slate",
  });
  const payload = { ...parsed, id: undefined, is_active: true };
  const query = parsed.id
    ? service.from("tags").update(payload).eq("id", parsed.id)
    : service.from("tags").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.code === "23505" ? "A tag with this name already exists in the product." : error.message);
  revalidatePath("/admin/settings");
}

export async function archiveTaxonomy(formData: FormData) {
  const { service } = await requireAdminAction();
  const id = z.string().uuid().parse(value(formData, "id"));
  const type = z.enum(["collection", "tag"]).parse(value(formData, "type"));
  const { error } = await service.from(type === "collection" ? "collections" : "tags").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}

export async function saveReportTemplate(formData: FormData) {
  const { service, user } = await requireAdminAction();
  const parsed = reportTemplateSchema.parse({
    id: value(formData, "id") || undefined,
    category_slug: value(formData, "category_slug"),
    slug: value(formData, "slug"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    icon: value(formData, "icon"),
    type: value(formData, "type"),
    goal: value(formData, "goal"),
    system_prompt: value(formData, "system_prompt"),
    user_prompt_template: value(formData, "user_prompt_template"),
    visibility: value(formData, "visibility"),
    status: value(formData, "status"),
    min_plan: value(formData, "min_plan"),
    sort_order: value(formData, "sort_order"),
    model: value(formData, "model"),
    temperature: value(formData, "temperature") || undefined,
    max_documents: value(formData, "max_documents") || undefined,
    max_context_chunks: value(formData, "max_context_chunks") || undefined,
  });

  const payload = {
    ...parsed,
    description: parsed.description || null,
    icon: parsed.icon || null,
    model: parsed.model || null,
    temperature: parsed.temperature ?? null,
    max_documents: parsed.max_documents ?? null,
    max_context_chunks: parsed.max_context_chunks ?? null,
    created_by: user.id,
    metadata: {},
  };

  const query = parsed.id
    ? service.from("report_templates").update(payload).eq("id", parsed.id)
    : service.from("report_templates").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.code === "23505" ? "A report template with this slug already exists in the product." : error.message);
  revalidatePath("/admin/settings");
}

export async function savePlan(formData: FormData) {
  const { service } = await requireAdminAction();
  const parsed = planSchema.parse({
    id: value(formData, "id") || undefined,
    category_slug: value(formData, "category_slug"),
    slug: value(formData, "slug"),
    name: value(formData, "name"),
    price_monthly: value(formData, "price_monthly"),
    creem_product_id: value(formData, "creem_product_id"),
    max_storage_bytes: value(formData, "max_storage_bytes"),
    max_queries_day: value(formData, "max_queries_day"),
    max_reports_month: value(formData, "max_reports_month"),
  });

  const payload = {
    ...parsed,
    creem_product_id: parsed.creem_product_id || null,
  };

  const query = parsed.id
    ? service.from("plans").update(payload).eq("id", parsed.id)
    : service.from("plans").upsert(payload, { onConflict: "slug,category_slug" });
  const { error } = await query;
  if (error) throw new Error(error.code === "23505" ? "That plan already exists for this product." : error.message);
  revalidatePath("/admin/settings");
}

export async function archiveReportTemplate(formData: FormData) {
  const { service } = await requireAdminAction();
  const id = z.string().uuid().parse(value(formData, "id"));
  const { error } = await service.from("report_templates").update({ status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}

export async function archivePlan(formData: FormData) {
  const { service } = await requireAdminAction();
  const id = z.string().uuid().parse(value(formData, "id"));
  const { error } = await service
    .from("plans")
    .update({ creem_product_id: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}

export async function saveTheme(formData: FormData) {
  const { service } = await requireAdminAction();
  const parsed = themeSchema.parse({
    id: value(formData, "id") || undefined,
    slug: value(formData, "slug"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    primary_color: value(formData, "primary_color"),
    primary_hover_color: value(formData, "primary_hover_color"),
    primary_foreground_color: value(formData, "primary_foreground_color"),
    soft_color: value(formData, "soft_color"),
    soft_dark_color: value(formData, "soft_dark_color"),
    soft_foreground_color: value(formData, "soft_foreground_color"),
    soft_foreground_dark_color: value(formData, "soft_foreground_dark_color"),
    border_color: value(formData, "border_color"),
    border_dark_color: value(formData, "border_dark_color"),
    sort_order: value(formData, "sort_order"),
  });

  const payload = { ...parsed, id: undefined, is_active: true };
  const query = parsed.id
    ? service.from("themes").update(payload).eq("id", parsed.id)
    : service.from("themes").insert(payload);
  const { error } = await query;
  if (error)
    throw new Error(
      error.code === "23505"
        ? "A theme with this slug already exists."
        : error.message,
    );
  revalidatePath("/admin/settings");
}

export async function archiveTheme(formData: FormData) {
  const { service } = await requireAdminAction();
  const id = z.string().uuid().parse(value(formData, "id"));
  const { error } = await service.from("themes").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}
