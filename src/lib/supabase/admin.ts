// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
