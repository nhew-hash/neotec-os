import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isRotaPublica } from "@/lib/rotas-publicas";

export async function middleware(request: NextRequest) {

  const pathname = request.nextUrl.pathname;


  // ======================================================
  // ROTAS PÚBLICAS
  // Essas rotas nunca podem pedir login
  // ======================================================

  const isPublicRoute = isRotaPublica(pathname);


  // Se for webhook da Meta, libera direto
  if (pathname.startsWith("/api/whatsapp/webhook")) {
    return NextResponse.next();
  }


  let response = NextResponse.next({
    request,
  });


  // ======================================================
  // SUPABASE SESSION
  // ======================================================

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

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );

        },

      },
    }
  );


  // Rotas privadas: getUser() valida o JWT no servidor do Supabase (getSession só
  // lê o cookie, sem validar — auditoria S-04). Rotas públicas mantêm getSession
  // (só renova o cookie), evitando uma ida ao Auth em cada página da loja.
  let session: { user: { id: string } } | null = null;
  if (isPublicRoute) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } else {
    const { data } = await supabase.auth.getUser();
    session = data.user ? { user: { id: data.user.id } } : null;
  }



  // ======================================================
  // BLOQUEIO DE ÁREA PRIVADA
  // ======================================================

  if (!session && !isPublicRoute) {

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );

  }

  // ======================================================
  // INVESTIDOR / INDICADOR — só acessam a própria área
  // Login normal, mas nunca devem alcançar o resto do
  // sistema interno (mesmo que RLS já bloqueie o DADO, a
  // TELA vazia/quebrada é confusa — aqui já barra antes).
  // ======================================================

  if (session && !isPublicRoute) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("cargo")
      .eq("id", session.user.id)
      .maybeSingle();

    if (perfil?.cargo === "investidor" && !pathname.startsWith("/investidor")) {
      return NextResponse.redirect(new URL("/investidor", request.url));
    }
    if (perfil?.cargo === "indicador" && !pathname.startsWith("/indicador")) {
      return NextResponse.redirect(new URL("/indicador", request.url));
    }
    if (perfil?.cargo === "vendedor_prostec" && !pathname.startsWith("/prostec")) {
      return NextResponse.redirect(new URL("/prostec", request.url));
    }
  }

  return response;

}



// ======================================================
// Rotas onde o middleware roda
// ======================================================

export const config = {

  matcher: [
    // Arquivos de /public (logo, imagens) não passam pelo login — antes o
    // /logo-neotec.png era redirecionado para /login e a loja mostrava o logo quebrado.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],

};