import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {

  const pathname = request.nextUrl.pathname;


  // ======================================================
  // ROTAS PÚBLICAS
  // Essas rotas nunca podem pedir login
  // ======================================================

 const publicRoutes = [
  "/login",
  "/portal",
  "/consultar-os",
  "/loja",
  "/api/whatsapp/webhook",
  "/api/integracoes/whatsapp-web",
  "/api/cron",
  "/api/mercadopago",
];


  const isPublicRoute = pathname === "/" || publicRoutes.some((route) =>
    pathname.startsWith(route)
  );


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


  const {
    data: {
      session
    },
  } = await supabase.auth.getSession();



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
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],

};