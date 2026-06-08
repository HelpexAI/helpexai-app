-- Fix ambiguous questions_used reference in the public tool reservation function.

CREATE OR REPLACE FUNCTION reserve_public_tool_question(p_token_hash TEXT)
RETURNS TABLE(allowed BOOLEAN, questions_used INTEGER, document_name TEXT, document_text TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session public_tool_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM public_tool_sessions
    WHERE token_hash = p_token_hash AND expires_at > now() FOR UPDATE;
  IF NOT FOUND OR NOT v_session.email_captured OR v_session.questions_used >= 5 THEN
    RETURN QUERY SELECT false, COALESCE(v_session.questions_used, 5), NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  UPDATE public_tool_sessions AS session
    SET questions_used = session.questions_used + 1, updated_at = now()
    WHERE session.id = v_session.id;
  RETURN QUERY SELECT true, v_session.questions_used + 1, v_session.document_name, v_session.document_text;
END; $$;

REVOKE ALL ON FUNCTION reserve_public_tool_question(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_public_tool_question(TEXT) TO service_role;
