import type {NeonQueryFunction} from '@neondatabase/serverless';
import type {AccountStore,User,StoredProgress} from './accounts.ts';
export async function createAccountStore(sql:NeonQueryFunction<false,false>):Promise<AccountStore>{
 await sql`CREATE TABLE IF NOT EXISTS echoloop.accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),username text NOT NULL UNIQUE,password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`;
 await sql`CREATE TABLE IF NOT EXISTS echoloop.sessions (token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES echoloop.accounts(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days')`;
 await sql`CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON echoloop.sessions(expires_at)`;
 await sql`CREATE TABLE IF NOT EXISTS echoloop.account_progress (user_id uuid PRIMARY KEY REFERENCES echoloop.accounts(id) ON DELETE CASCADE,revision integer NOT NULL DEFAULT 1,payload jsonb NOT NULL CHECK (octet_length(payload::text)<=393216),updated_at timestamptz NOT NULL DEFAULT now())`;
 return {
  async createUser(username,passwordHash){const rows=await sql`INSERT INTO echoloop.accounts(username,password_hash) VALUES(${username},${passwordHash}) ON CONFLICT(username) DO NOTHING RETURNING id,username,password_hash`;return rows[0] as User??null;},
  async findUser(username){const rows=await sql`SELECT id,username,password_hash FROM echoloop.accounts WHERE username=${username}`;return rows[0] as User??null;},
  async createSession(hash,userId){await sql`DELETE FROM echoloop.sessions WHERE expires_at<=now()`;await sql`INSERT INTO echoloop.sessions(token_hash,user_id) VALUES(${hash},${userId})`;},
  async getSession(hash){const rows=await sql`SELECT a.id,a.username,a.password_hash FROM echoloop.sessions s JOIN echoloop.accounts a ON a.id=s.user_id WHERE s.token_hash=${hash} AND s.expires_at>now()`;return rows[0] as User??null;},
  async deleteSession(hash){await sql`DELETE FROM echoloop.sessions WHERE token_hash=${hash}`;},
  async getProgress(userId){const rows=await sql`SELECT revision,payload,updated_at FROM echoloop.account_progress WHERE user_id=${userId}`;return rows[0] as StoredProgress??null;},
  async putProgress(userId,revision,payload){const raw=JSON.stringify(payload);const rows=revision===0?await sql`INSERT INTO echoloop.account_progress(user_id,payload) VALUES(${userId},${raw}::jsonb) ON CONFLICT(user_id) DO NOTHING RETURNING revision,payload,updated_at`:await sql`UPDATE echoloop.account_progress SET payload=${raw}::jsonb,revision=revision+1,updated_at=now() WHERE user_id=${userId} AND revision=${revision} RETURNING revision,payload,updated_at`;return rows[0] as StoredProgress??null;}
 };
}
