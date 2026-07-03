import { extractDocumentPages } from "@/lib/ai/pipeline/ingest";
import {
  isSemanticSearchUnavailable,
  queryDocuments,
  queryDocumentsFromRawText,
} from "@/lib/ai/pipeline/query";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { SendMessageSchema } from "@/lib/validations/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logEvent, reportError } from "@/lib/monitoring";
import { NextResponse } from "next/server";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import {
  sanitizeJsonForStorage,
  sanitizeTextForStorage,
} from "@/lib/text/sanitize";

function conversationTitle(message: string) {
  const words = message.trim().replace(/\s+/g, " ").split(" ");
  const title = words.slice(0, 7).join(" ");
  return title.length > 70 ? `${title.slice(0, 67)}...` : title;
}

async function queryWithSelectedDocumentFallback(
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>,
  question: string,
  selectedDocumentIds: string[],
  externalResearchEnabled: boolean,
) {
  async function querySelectedDocumentsDirectly() {
    const { data: documents, error: documentsError } = await context.service
      .from("documents")
      .select(
        "id, name, file_path, file_type, collection:collections(name, ai_context), document_tag_assignments(tag:tags(name, ai_context))",
      )
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .in("id", selectedDocumentIds);
    if (documentsError) throw documentsError;

    const rawDocuments = [];
    for (const document of documents ?? []) {
      try {
        const collection = Array.isArray(document.collection)
          ? document.collection[0]
          : document.collection;
        const assignedTags = (document.document_tag_assignments ?? [])
          .flatMap((assignment) =>
            Array.isArray(assignment.tag) ? assignment.tag : [assignment.tag],
          )
          .filter(Boolean);
        const { data: file, error: downloadError } =
          await context.service.storage
            .from("documents")
            .download(document.file_path);
        if (!file || downloadError) continue;
        rawDocuments.push({
          id: document.id,
          name: document.name,
          collectionName: collection?.name,
          collectionContext: collection?.ai_context,
          tags: assignedTags.map((tag) => tag.name),
          tagContext: assignedTags
            .map((tag) => tag.ai_context)
            .filter(Boolean)
            .join(" "),
          pages: await extractDocumentPages(
            Buffer.from(await file.arrayBuffer()),
            document.file_type,
          ),
        });
      } catch (error) {
        console.warn(
          `Could not extract fallback text from ${document.name}:`,
          error,
        );
      }
    }

    return queryDocumentsFromRawText({
      categorySlug: context.category,
      question,
      documents: rawDocuments,
      externalResearchEnabled,
    });
  }

  try {
    const result = await queryDocuments({
      userId: context.user.id,
      categorySlug: context.category,
      question,
      selectedDocumentIds,
      externalResearchEnabled,
    });

    if (
      result.answerType === "document" ||
      selectedDocumentIds.length === 0
    ) {
      return { result, fallbackUsed: false, fallbackReason: null };
    }
    console.warn(
      "Semantic search returned no grounded context; using selected documents directly.",
    );
    return {
      result: await querySelectedDocumentsDirectly(),
      fallbackUsed: true,
      fallbackReason: "weak_semantic_context" as const,
    };
  } catch (error) {
    if (!selectedDocumentIds.length || !isSemanticSearchUnavailable(error)) {
      throw error;
    }
    console.warn(
      "Semantic search unavailable; using direct selected-document context.",
      error,
    );
    return {
      result: await querySelectedDocumentsDirectly(),
      fallbackUsed: true,
      fallbackReason: "semantic_search_unavailable" as const,
    };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(
    `conversation-message:${context.user.id}:${context.category}`,
    15,
    60,
  );
  if (limited) return limited;
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json(
      {
        error:
          "Choose which documents to keep before continuing conversations.",
        code: "DOCUMENT_LIMIT_RESOLUTION_REQUIRED",
      },
      { status: 403 },
    );
  }

  const parsed = SendMessageSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || parsed.data.category_slug !== context.category) {
    return NextResponse.json(
      {
        error: parsed.success
          ? "Wrong active workspace."
          : parsed.error.issues[0]?.message,
      },
      { status: 400 },
    );
  }

  const { data: conversation } = await context.service
    .from("conversations")
    .select("id, title, conversation_scope, selected_document_ids, external_research_enabled")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!conversation)
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );

  const requestId = crypto.randomUUID();
  await logEvent("frontend_conversation_message_received", {
    requestId,
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    conversationId: conversation.id,
    selectedDocumentIds: conversation.selected_document_ids,
    conversationScope: conversation.conversation_scope,
    externalResearchEnabled: conversation.external_research_enabled,
    messageLength: parsed.data.content.length,
  });
  const { data: reservation, error: reservationError } =
    await context.service.rpc("reserve_daily_query", {
      p_user_id: context.user.id,
      p_category_slug: context.category,
      p_request_id: requestId,
    });
  if (reservationError) {
    return NextResponse.json(
      {
        error:
          "Question quota protection is unavailable. Apply the alpha hardening migration.",
      },
      { status: 503 },
    );
  }
  const quota = reservation?.[0];
  if (!quota?.allowed) {
    return NextResponse.json(
      {
        error: `You have reached today's ${quota?.quota_limit ?? 100}-question limit.`,
        code: "QUERY_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const { data: userMessage, error: userError } = await context.service
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      role: "user",
      content: sanitizeTextForStorage(parsed.data.content),
    })
    .select()
    .single();
  if (userError) {
    await context.service
      .from("usage_logs")
      .delete()
      .eq("request_id", requestId);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (conversation.title === "New Conversation") {
    await context.service
      .from("conversations")
      .update({
        title: sanitizeTextForStorage(conversationTitle(parsed.data.content)),
        is_locked: true,
      })
      .eq("id", conversation.id);
  }

  try {
    await logEvent("conversation_semantic_query_started", {
      requestId,
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      conversationId: conversation.id,
      selectedDocumentCount: conversation.selected_document_ids.length,
      conversationScope: conversation.conversation_scope,
    });
    const { result, fallbackUsed, fallbackReason } =
      await queryWithSelectedDocumentFallback(
        context,
        parsed.data.content,
        conversation.selected_document_ids,
        conversation.external_research_enabled,
      );
    if (conversation.conversation_scope === "workplace") result.sources = [];
    const { data: assistantMessage, error: assistantError } =
      await context.service
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: sanitizeTextForStorage(result.answer),
          sources: sanitizeJsonForStorage(result.sources),
          answer_type: result.answerType,
          tokens_used: result.tokensUsed,
        })
        .select()
        .single();
    if (assistantError) throw assistantError;

    const { error: usageError } = await context.service
      .from("usage_logs")
      .update({ tokens_used: result.tokensUsed })
      .eq("request_id", requestId);
    if (usageError) {
      await context.service
        .from("usage_logs")
        .delete()
        .eq("request_id", requestId);
      await context.service
        .from("messages")
        .delete()
        .eq("id", assistantMessage.id);
      await context.service.from("messages").delete().eq("id", userMessage.id);
      return NextResponse.json(
        { error: "Could not record successful answer usage." },
        { status: 500 },
      );
    }

    await context.service
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);
    await logEvent("conversation_answer_completed", {
      requestId,
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      conversationId: conversation.id,
      answerType: result.answerType,
      sourceCount: result.sources.length,
      tokensUsed: result.tokensUsed,
      fallbackUsed,
      fallbackReason,
    });
    revalidateWorkspacePaths();
    return NextResponse.json({
      userMessage,
      assistantMessage,
      counted: true,
      warning: fallbackUsed
        ? fallbackReason === "weak_semantic_context"
          ? "The semantic match was weak, so the answer used direct selected-document context."
          : "Semantic search is temporarily unavailable, so the answer used direct selected-document context."
        : undefined,
    });
  } catch (error) {
    await reportError(error, {
      area: "conversation-query",
      requestId,
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      conversationId: conversation.id,
    });
    await context.service
      .from("usage_logs")
      .delete()
      .eq("request_id", requestId);
    await context.service.from("messages").delete().eq("id", userMessage.id);
    const message =
      error instanceof Error ? `${error.name} ${error.message}` : String(error);
    const providerMessage = /429|rate.?limit|quota/i.test(message)
      ? "The AI provider rate limit has been reached. Please wait a moment and try again."
      : /decommissioned|model_not_found|invalid.*model/i.test(message)
        ? "The configured AI model is unavailable. Please contact support."
        : "AI analysis is temporarily unavailable. Please try again shortly.";
    return NextResponse.json(
      {
        error: providerMessage,
        code: "AI_PROVIDER_UNAVAILABLE",
        counted: false,
      },
      { status: 503 },
    );
  }
}
