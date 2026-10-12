import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side only client. Never import this from a Client Component.
//
// The app lives in the `ideas` schema of the shared Help Me Kara Supabase
// project. It does NOT use the service role key. Instead it signs in as one
// dedicated owner user and sends that user's token with every request, so
// row level security (see supabase/migrations/0001_ideas.sql) only
// lets that single user read or write ideas rows.
//
// Environment variables:
//   NEXT_PUBLIC_SUPABASE_URL   project URL
//   SUPABASE_ANON_KEY          the project's public anon / publishable key
//   IDEAS_DB_EMAIL          email of the ideas owner user
//   IDEAS_DB_PASSWORD       password of the ideas owner user

type CachedToken = { token: string; expiresAtMs: number };
let cachedToken: CachedToken | null = null;
let inflight: Promise<string> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;
let cachedClient: AnyClient | null = null;

async function signIn(url: string, anonKey: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.IDEAS_DB_EMAIL,
      password: process.env.IDEAS_DB_PASSWORD,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Ideas database sign-in failed (HTTP ${res.status}). Check IDEAS_DB_EMAIL and IDEAS_DB_PASSWORD.`
    );
  }
  const body = await res.json();
  // Refresh a minute early so a token never expires mid-request.
  cachedToken = {
    token: body.access_token,
    expiresAtMs: Date.now() + (body.expires_in - 60) * 1000,
  };
  return body.access_token as string;
}

export function getSupabaseServerClient(): AnyClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY environment variables."
    );
  }

  const getToken = async (): Promise<string> => {
    if (cachedToken && Date.now() < cachedToken.expiresAtMs) return cachedToken.token;
    if (!inflight) inflight = signIn(url, anonKey).finally(() => { inflight = null; });
    return inflight;
  };

  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "ideas" },
    global: {
      fetch: async (input, init) => {
        const token = await getToken();
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });

  return cachedClient;
}
