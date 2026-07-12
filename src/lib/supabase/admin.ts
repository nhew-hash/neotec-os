import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a Service Role Key — privilégio total, ignora RLS.
 * Uso EXCLUSIVO em Server Actions que precisam de operações administrativas
 * (ex: criar usuário de Auth para o Portal do Cliente via API admin).
 *
 * NUNCA importar este arquivo em um Client Component, nem expor
 * SUPABASE_SERVICE_ROLE_KEY com o prefixo NEXT_PUBLIC_. Se isso acontecer,
 * qualquer visitante do site ganha acesso total ao banco.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
