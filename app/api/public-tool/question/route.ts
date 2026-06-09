import { queryPublicDocument } from "@/lib/ai/public-query";
import { logEvent, reportError } from "@/lib/monitoring";
import { hashPublicValue, publicSessionToken } from "@/lib/public-tool/session";
import { enforceRateLimit, requestIp } from "@/lib/security/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ question: z.string().trim().min(2).max(1000) });

export async function POST(request: Request) {
  const token = await publicSessionToken();
  if (!token) return NextResponse.json({ error: "Upload a document first." }, { status: 401 });
  const tokenHash = hashPublicValue(token);
  const ipHash = hashPublicValue(requestIp(request));
  const limited = await enforceRateLimit(`public-tool-question:${ipHash}`, 8, 3600);
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a question about your document." }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service.rpc("reserve_public_tool_question", { p_token_hash: tokenHash });
  if (error) {
    reportError(error, { area: "public-tool-question-reservation" });
    return NextResponse.json(
      {
        error: "Public question protection is temporarily unavailable.",
        detail: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 503 },
    );
  }
  const reservation = data?.[0];
  if (!reservation?.allowed) {
    return NextResponse.json({ error: "You have used all 5 free questions.", code: "PUBLIC_QUESTION_LIMIT" }, { status: 403 });
  }

  const userMessage = { id: crypto.randomUUID(), role: "user", content: parsed.data.question, created_at: new Date().toISOString() };
  try {
    await logEvent("public_tool_question_received", {
      ipHash,
      questionLength: parsed.data.question.length,
      questionsUsed: reservation.questions_used,
      documentName: reservation.document_name,
    });
    const result = await queryPublicDocument(parsed.data.question, {
      id: "public-document",
      name: reservation.document_name,
      text: reservation.document_text,
    }, reservation.external_research_enabled);
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: result.answer,
      sources: result.sources,
      created_at: new Date().toISOString(),
    };
    const { error: completionError } = await service.rpc("complete_public_tool_question", {
      p_token_hash: tokenHash,
      p_user_message: userMessage,
      p_assistant_message: assistantMessage,
    });
    if (completionError) throw completionError;
    await logEvent("public_tool_answer_completed", {
      ipHash,
      questionsUsed: reservation.questions_used,
      documentName: reservation.document_name,
      tokensUsed: result.tokensUsed,
      externalResearchEnabled: reservation.external_research_enabled,
    });
    return NextResponse.json({ userMessage, assistantMessage, questionsUsed: reservation.questions_used });
  } catch (error) {
    await service.rpc("release_public_tool_question", { p_token_hash: tokenHash });
    reportError(error, { area: "public-tool-question" });
    return NextResponse.json({ error: "AI analysis is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
