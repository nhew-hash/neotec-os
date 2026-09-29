import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Fase 255 — auditoria do Analytics da Loja encontrou números
 * congelados mesmo após eventos novos confirmados no banco (teste ao
 * vivo). A causa mais provável é o Data Cache do Next reaproveitando
 * as respostas `fetch` que o supabase-js faz por baixo — esse cliente
 * é escopado por sessão/cookies (RLS), então cachear a resposta de uma
 * query entre requisições nunca faz sentido aqui, em NENHUM serviço
 * que o usa (não só Analytics). Força `cache: "no-store"` em toda
 * chamada feita por este client, sem precisar mexer em cada service.
 */
function fetchSemCache(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}

/**
 * Cliente Supabase para uso em Server Components, Server Actions e
 * Route Handlers. Lê/escreve a sessão via cookies do Next.js.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchSemCache },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: {
              path?: string;
              maxAge?: number;
              expires?: Date;
              httpOnly?: boolean;
              secure?: boolean;
              sameSite?: "lax" | "strict" | "none";
            };
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado em contexto onde escrita de cookies não é permitida.
            // O middleware mantém a sessão sincronizada.
          }
        },
      },
    }
  );
}