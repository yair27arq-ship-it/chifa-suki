import { createClient } from '@supabase/supabase-js';

// Cliente con service role — solo usar en server actions, nunca en el cliente
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
