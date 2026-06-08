import { getDocumentRequestContext } from "@/lib/documents/server";
import { RenameConversationSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RenameConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await context.service
    .from("conversations")
    .update({ title: parsed.data.title.trim() })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .select("id, title, selected_document_ids, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  return NextResponse.json({ conversation: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await context.service
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
