import { fileTypeFromFile, safeStorageFilename } from "@/lib/documents/server";
import { requestIp, enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { MAX_FILE_SIZE } from "@/lib/validations/schemas";
import {
  createPublicSessionToken,
  hashPublicValue,
  publicSessionCookie,
  PUBLIC_TOOL_COOKIE,
  PUBLIC_TOOL_TEXT_LIMIT,
  publicSessionToken,
} from "@/lib/public-tool/session";
import { NextResponse } from "next/server";
import { logEvent, reportError } from "@/lib/monitoring";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";
import { extractDocumentPages } from "@/lib/ai/pipeline/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

function sessionView(session: Record<string, unknown>) {
  const documentText = typeof session.document_text === "string" ? session.document_text : "";
  return {
    documentName: session.document_name,
    emailCaptured: session.email_captured,
    questionsUsed: session.questions_used,
    externalResearchEnabled: session.external_research_enabled,
    messages: session.messages,
    expiresAt: session.expires_at,
    documentReadable: documentText.replace(/\s/g, "").length >= 20,
  };
}

export async function GET() {
  const token = await publicSessionToken();
  if (!token) return NextResponse.json({ session: null });
  const service = createServiceClient();
  const { data } = await service
    .from("public_tool_sessions")
    .select(
      "document_name, document_text, email_captured, external_research_enabled, questions_used, messages, expires_at",
    )
    .eq("token_hash", hashPublicValue(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return NextResponse.json({ session: data ? sessionView(data) : null });
}

export async function POST(request: Request) {
  const ipHash = hashPublicValue(requestIp(request));
  // Version the key so previously failed deployments do not lock visitors out for 24 hours.
  const limited = await enforceRateLimit(
    `public-tool-upload-attempt:v2:${ipHash}`,
    10,
    3600,
  );
  if (limited) return limited;

  const service = createServiceClient();
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count, error: sessionLookupError } = await service
    .from("public_tool_sessions")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (sessionLookupError) {
    console.error("Public tool session lookup failed:", sessionLookupError);
    return NextResponse.json(
      {
        error:
          "The free tool database is not configured. Apply migration 005_public_tool.sql to the Supabase project used by this deployment.",
        code: "PUBLIC_TOOL_DATABASE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      {
        error:
          "A free tool session has already been used from this connection today.",
        code: "PUBLIC_TRIAL_USED",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "Choose a document to upload." },
      { status: 400 },
    );
  const fileType = fileTypeFromFile(file);
  if (!fileType || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Upload a PDF, DOCX, or TXT file no larger than 10MB." },
      { status: 400 },
    );
  }

  let text = "";
  let readableCharacters = 0;
  let extractionWarning: string | undefined;
  try {
    const pages = await extractDocumentPages(Buffer.from(await file.arrayBuffer()), fileType);
    text = sanitizeTextForStorage(pages
      .map((page) => page.text)
      .join("\n\n")
      .trim())
      .slice(0, PUBLIC_TOOL_TEXT_LIMIT);
    readableCharacters = text.replace(/\s/g, "").length;
    if (readableCharacters < 20) {
      extractionWarning =
        "We uploaded the document, but recovered very little readable text. You can still ask questions, and HelpexAI will explain when the file cannot support an answer.";
    }
  } catch (error) {
    extractionWarning =
      "We uploaded the document, but could not recover enough readable text. You can still ask questions, and HelpexAI will explain when the file cannot support an answer.";
    await reportError(error, { area: "public-tool-document-low-readability", documentName: file.name, fileType, ipHash });
  }
  await logEvent(extractionWarning ? "public_tool_document_accepted_with_warning" : "public_tool_document_validated", {
    documentName: file.name,
    fileType,
    fileSize: file.size,
    readableCharacters,
    ipHash,
  });

  try {
    const token = createPublicSessionToken();
    const { data, error } = await service
      .from("public_tool_sessions")
      .insert({
        token_hash: hashPublicValue(token),
        ip_hash: ipHash,
        document_name: safeStorageFilename(file.name),
        document_type: fileType,
        document_text: text,
      })
      .select(
        "document_name, document_text, email_captured, external_research_enabled, questions_used, messages, expires_at",
      )
      .single();
    if (error) throw error;

    const response = NextResponse.json(
      { session: sessionView(data), warning: extractionWarning },
      { status: 201 },
    );
    const cookie = publicSessionCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("Public tool session creation failed:", error);
    return NextResponse.json(
      {
        error:
          "Could not create the free-tool session. Please try again shortly.",
        code: "PUBLIC_TOOL_SESSION_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const token = await publicSessionToken();
  if (token) {
    await createServiceClient()
      .from("public_tool_sessions")
      .update({ document_text: "", expires_at: new Date().toISOString() })
      .eq("token_hash", hashPublicValue(token));
  }
  const response = NextResponse.json({ deleted: true });
  response.cookies.set(PUBLIC_TOOL_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
