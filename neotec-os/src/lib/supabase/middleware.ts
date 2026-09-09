import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza a sessão do Supabase a cada requisição e protege as rotas
 * internas do sistema.
 *
 * Rotas públicas:
 * - /login
 * - /portal
 * - /consultar-os
 * - /loja
 *
 * Área interna exige sessão da equipe.
 */

const PREFIXOS_PUBLICOS = [
  "/login",
  "/portal",
  "/consultar-os",
  "/loja",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isRotaPublica = PREFIXOS_PUBLICOS.some((prefixo) =>
    pathname.startsWith(prefixo)
  );

  const isLoginPage = pathname.startsWith("/login");

  /**
   * Usuário sem sessão tentando acessar área interna
   */
  if (!user && !isRotaPublica) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/login";

    return NextResponse.redirect(redirectUrl);
  }

  /**
   * Usuário já logado tentando voltar para login
   */
  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/dashboard";

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}