import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Server Actions / Route Handlers (con cookies de sesión) ──
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch { /* Server Components no pueden setear cookies */ }
      },
    },
  });
}

// ── Cliente sin cookies — para queries dentro de unstable_cache ──
// Usa la service role key: sin RLS, no necesita sesión de usuario.
// Solo para datos de lectura que no sean por usuario (ej: métricas globales).
export function getSupabaseService() {
  return createClient(supabaseUrl, supabaseServiceKey);
}
