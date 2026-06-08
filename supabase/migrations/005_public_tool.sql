-- Public document tool: expiring document sessions, marketing leads, and atomic limits.

CREATE TABLE IF NOT EXISTS public_tool_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'public_tool',
  marketing_consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_tool_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT NOT NULL,
  email_hash TEXT,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('pdf', 'docx', 'txt')),
  document_text TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_used INTEGER NOT NULL DEFAULT 0 CHECK (questions_used BETWEEN 0 AND 5),
  email_captured BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_tool_sessions_ip_created
  ON public_tool_sessions(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_tool_sessions_expires
  ON public_tool_sessions(expires_at);

ALTER TABLE public_tool_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_tool_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public_tool_leads, public_tool_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION activate_public_tool_session(
  p_token_hash TEXT,
  p_email TEXT,
  p_email_hash TEXT
)
RETURNS TABLE(activated BOOLEAN, reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session public_tool_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM public_tool_sessions
    WHERE token_hash = p_token_hash AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'expired'; RETURN; END IF;
  IF v_session.email_captured THEN RETURN QUERY SELECT true, 'already_active'; RETURN; END IF;

  INSERT INTO public_tool_leads(email, email_hash)
  VALUES (lower(trim(p_email)), p_email_hash)
  ON CONFLICT (email_hash) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'email_already_used'; RETURN; END IF;

  UPDATE public_tool_sessions
    SET email_hash = p_email_hash, email_captured = true, updated_at = now()
    WHERE id = v_session.id;
  RETURN QUERY SELECT true, 'activated';
END; $$;

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

CREATE OR REPLACE FUNCTION complete_public_tool_question(
  p_token_hash TEXT,
  p_user_message JSONB,
  p_assistant_message JSONB
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public_tool_sessions
    SET messages = messages || jsonb_build_array(p_user_message, p_assistant_message), updated_at = now()
    WHERE token_hash = p_token_hash AND expires_at > now();
END; $$;

CREATE OR REPLACE FUNCTION release_public_tool_question(p_token_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public_tool_sessions
    SET questions_used = GREATEST(questions_used - 1, 0), updated_at = now()
    WHERE token_hash = p_token_hash AND expires_at > now();
END; $$;

REVOKE ALL ON FUNCTION activate_public_tool_session(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reserve_public_tool_question(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_public_tool_question(TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_public_tool_question(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_public_tool_session(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_public_tool_question(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_public_tool_question(TEXT, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION release_public_tool_question(TEXT) TO service_role;
