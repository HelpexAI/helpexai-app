import { extractDocumentText } from "@/lib/ai/pipeline/ingest";
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

export const runtime = "nodejs";
export const maxDuration = 60;

function sessionView(session: Record<string, unknown>) {
  return {
    documentName: session.document_name,
    emailCaptured: session.email_captured,
    questionsUsed: session.questions_used,
    messages: session.messages,
    expiresAt: session.expires_at,
  };
}

export async function GET() {
  const token = await publicSessionToken();
  if (!token) return NextResponse.json({ session: null });
  const service = createServiceClient();
  const { data } = await service
    .from("public_tool_sessions")
    .select("document_name, email_captured, questions_used, messages, expires_at")
    .eq("token_hash", hashPublicValue(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return NextResponse.json({ session: data ? sessionView(data) : null });
}

export async function POST(request: Request) {
  const ipHash = hashPublicValue(requestIp(request));
  // Version the key so previously failed deployments do not lock visitors out for 24 hours.
  const limited = await enforceRateLimit(`public-tool-upload-attempt:v2:${ipHash}`, 10, 3600);
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
        error: "The free tool database is not configured. Apply migration 005_public_tool.sql to the Supabase project used by this deployment.",
        code: "PUBLIC_TOOL_DATABASE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
  if ((count ?? 0) >= 1) {
    return NextResponse.json(
      { error: "A free tool session has already been used from this connection today.", code: "PUBLIC_TRIAL_USED" },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });
  const fileType = fileTypeFromFile(file);
  if (!fileType || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Upload a PDF, DOCX, or TXT file no larger than 10MB." }, { status: 400 });
  }

  let text: string;
  try {
    text = (await extractDocumentText(Buffer.from(await file.arrayBuffer()), fileType))
      .trim()
      .slice(0, PUBLIC_TOOL_TEXT_LIMIT);
    if (!text) return NextResponse.json({ error: "No readable text was found in this document." }, { status: 400 });
  } catch (error) {
    console.error("Public tool document extraction failed:", error);
    return NextResponse.json(
      {
        error: `Could not read this ${fileType.toUpperCase()} document. Try a text-based file without password protection.`,
        code: "PUBLIC_TOOL_EXTRACTION_FAILED",
      },
      { status: 422 },
    );
  }

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
      .select("document_name, email_captured, questions_used, messages, expires_at")
      .single();
    if (error) throw error;

    const response = NextResponse.json({ session: sessionView(data) }, { status: 201 });
    const cookie = publicSessionCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("Public tool session creation failed:", error);
    return NextResponse.json(
      { error: "Could not create the free-tool session. Please try again shortly.", code: "PUBLIC_TOOL_SESSION_FAILED" },
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
