import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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