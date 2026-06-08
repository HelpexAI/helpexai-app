import { extractDocumentText } from "@/lib/ai/pipeline/ingest";
import { isEmbeddingUnavailable, queryDocuments, queryDocumentsFromRawText } from "@/lib/ai/pipeline/query";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { startOfTodayUtc } from "@/lib/usage/daily";
import { SendMessageSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";

function conversationTitle(message: string) {
  const words = message.trim().replace(/\s+/g, " ").split(" ");
  const title = words.slice(0, 7).join(" ");
  return title.length > 70 ? `${title.slice(0, 67)}...` : title;
}

async function queryWithSelectedDocumentFallback(
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>,
  question: string,
  selectedDocumentIds: string[],
) {
  try {
    return { result: await queryDocuments({
      userId: context.user.id,
      categorySlug: context.category,
      question,
      selectedDocumentIds,
    }), fallbackUsed: false };
  } catch (error) {
    if (!isEmbeddingUnavailable(error)) throw error;
    console.warn("OpenAI embeddings unavailable; using direct document context with Groq.");

    const { data: documents, error: documentsError } = await context.service
      .from("documents")
      .select("id, name, file_path, file_type")
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .in("id", selectedDocumentIds);
    if (documentsError) throw documentsError;

    const rawDocuments = [];
    for (const document of documents ?? []) {
      try {
        const { data: file, error: downloadError } = await context.service.storage
          .from("documents")
          .download(document.file_path);
        if (!file || downloadError) continue;
        rawDocuments.push({
          id: document.id,
          name: document.name,
          text: await extractDocumentText(Buffer.from(await file.arrayBuffer()), document.file_type),
        });
      } catch (error) {
        console.warn(`Could not extract fallback text from ${document.name}:`, error);
      }
    }

    return {
      result: await queryDocumentsFromRawText({
        categorySlug: context.category,
        question,
        documents: rawDocuments,
      }),
      fallbackUsed: true,
    };
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json(
      { error: "Choose which documents to keep before continuing conversations.", code: "DOCUMENT_LIMIT_RESOLUTION_REQUIRED" },
      { status: 403 },
    );
  }

  const parsed = SendMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.category_slug !== context.category) {
    return NextResponse.json(
      { error: parsed.success ? "Wrong active workspace." : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const { data: conversation } = await context.service
    .from("conversations")
    .select("id, title, selected_document_ids")
    .eq("id", params.id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const [{ data: plan }, { count }] = await Promise.all([
    context.service
      .from("plans")
      .select("max_queries_day")
      .eq("slug", context.plan)
      .eq("category_slug", context.category)
      .maybeSingle(),
    context.service
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .eq("action", "query")
      .gte("created_at", startOfTodayUtc()),
  ]);
  const maxQueries = plan?.max_queries_day ?? (context.plan === "pro" ? 50 : 3);
  if ((count ?? 0) >= maxQueries) {
    return NextResponse.json(
      { error: `You have reached today's ${maxQueries}-question limit.`, code: "QUERY_LIMIT_REACHED" },
      { status: 403 },
    );
  }

  const { data: userMessage, error: userError } = await context.service
    .from("messages")
    .insert({ conversation_id: conversation.id, role: "user", content: parsed.data.content })
    .select()
    .single();
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  if (conversation.title === "New Conversation") {
    await context.service
      .from("conversations")
      .update({ title: conversationTitle(parsed.data.content), is_locked: true })
      .eq("id", conversation.id);
  }

  try {
    const { result, fallbackUsed } = await queryWithSelectedDocumentFallback(
      context,
      parsed.data.content,
      conversation.selected_document_ids,
    );
    const { data: assistantMessage, error: assistantError } = await context.service
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        answer_type: result.answerType,
        tokens_used: result.tokensUsed,
      })
      .select()
      .single();
    if (assistantError) throw assistantError;

    const { error: usageError } = await context.service.from("usage_logs").insert({
      user_id: context.user.id,
      category_slug: context.category,
      action: "query",
      tokens_used: result.tokensUsed,
    });
    if (usageError) {
      await context.service.from("messages").delete().eq("id", assistantMessage.id);
      await context.service.from("messages").delete().eq("id", userMessage.id);
      return NextResponse.json({ error: "Could not record successful answer usage." }, { status: 500 });
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
      counted: true,
      warning: fallbackUsed
        ? "Semantic search is temporarily unavailable, so the answer used direct selected-document context."
        : undefined,
    });
  } catch (error) {
    console.error("Conversation query failed:", error);
    await context.service.from("messages").delete().eq("id", userMessage.id);
    const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    const providerMessage = /429|rate.?limit|quota/i.test(message)
      ? "The AI provider rate limit has been reached. Please wait a moment and try again."
      : /decommissioned|model_not_found|invalid.*model/i.test(message)
        ? "The configured AI model is unavailable. Please contact support."
        : "AI analysis is temporarily unavailable. Please try again shortly.";
    return NextResponse.json(
      { error: providerMessage, code: "AI_PROVIDER_UNAVAILABLE", counted: false },
      { status: 503 },
    );
  }
}
