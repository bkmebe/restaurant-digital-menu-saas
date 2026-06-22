-- Phase 6: Advanced Security Hardening

-- Device tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);

-- MFA recovery codes
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP or user_id
  endpoint TEXT NOT NULL,
  method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rate_limit_logs ON rate_limit_logs(identifier, endpoint, created_at);

-- Encrypted secrets store (for payment API keys, etc.)
CREATE TABLE IF NOT EXISTS encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

ALTER TABLE encrypted_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_secrets" ON encrypted_secrets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions SET is_active = false
  WHERE last_active_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Policy to prevent deletion of audit logs
CREATE POLICY "prevent_audit_log_deletion" ON audit_logs
  FOR DELETE USING (false);

CREATE POLICY "prevent_audit_log_update" ON audit_logs
  FOR UPDATE USING (false);
