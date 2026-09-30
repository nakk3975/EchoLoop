-- Dedicated EchoLoop Neon project only. Never run against another game's database.
CREATE SCHEMA IF NOT EXISTS echoloop;
CREATE TABLE IF NOT EXISTS echoloop.device_backup (
 owner_hash text PRIMARY KEY,
 revision integer NOT NULL DEFAULT 1,
 payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 393216),
 mutation_id uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
