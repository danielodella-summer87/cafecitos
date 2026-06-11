import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server-only)");

  _client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return _client;
}

/**
 * Descriptor seguro del destino Supabase para logs de diagnóstico.
 * No expone secretos: el host es público (viene de NEXT_PUBLIC_SUPABASE_URL),
 * y de la service role key solo se reporta presencia (boolean), nunca el valor.
 */
export function supabaseAdminTarget(): {
  urlHost: string | null;
  projectRef: string | null;
  hasServiceRoleKey: boolean;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  let urlHost: string | null = null;
  let projectRef: string | null = null;
  if (url) {
    try {
      urlHost = new URL(url).host;
      projectRef = urlHost.split(".")[0] || null;
    } catch {
      urlHost = null;
    }
  }
  return {
    urlHost,
    projectRef,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
