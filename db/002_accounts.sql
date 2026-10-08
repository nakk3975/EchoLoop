-- Also initialized idempotently by server/account-store.ts on application startup.
CREATE SCHEMA IF NOT EXISTS echoloop;
CREATE TABLE IF NOT EXISTS echoloop.accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 username text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS echoloop.sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES echoloop.accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON echoloop.sessions(expires_at);
CREATE TABLE IF NOT EXISTS echoloop.account_progress (
 user_id uuid PRIMARY KEY REFERENCES echoloop.accounts(id) ON DELETE CASCADE,
 revision integer NOT NULL DEFAULT 1,
 payload jsonb NOT NULL CHECK (octet_length(payload::text)<=393216),
 updated_at timestamptz NOT NULL DEFAULT now()
);
