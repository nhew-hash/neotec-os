import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza a sessão do Supabase a cada requisição e protege as rotas
 * internas do sistema. Só a área interna (fora de /login, /portal,
 * /consultar-os, /loja) exige sessão de EQUIPE — o Portal do Cliente e a
 * consulta pública de OS têm seus próprios fluxos de acesso (ou nenhum,
 * no caso da consulta pública), controlados nos respectivos layouts.
 */
const PREFIXOS_PUBLICOS = ["/login", "/portal", "/consultar-os", "/loja"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isRotaPublica = PREFIXOS_PUBLICOS.some((prefixo) => pathname.startsWith(prefixo));
  const isLoginPage = pathname.startsWith("/login");

  // Sem sessão e tentando acessar área interna da equipe → manda para o login
  if (!user && !isRotaPublica) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Já logado (equipe) tentando acessar o hub de login → manda para o dashboard.
  // Não se aplica a /portal/login: um cliente pode estar "user" autenticado
  // no Supabase Auth sem ser da equipe, e precisa continuar podendo ver
  // aquela tela (o próprio /portal/login trata esse caso).
  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
