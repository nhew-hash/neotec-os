import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {

  // Libera webhook WhatsApp da Meta
  if (request.nextUrl.pathname === "/api/whatsapp/webhook") {
    return NextResponse.next();
  }

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
        setAll(cookies) {
          cookies.forEach(({ name, value }) =>
            response.cookies.set(name, value)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();


  const publicRoutes = [
    "/login",
    "/api/whatsapp/webhook",
  ];


  const isPublic = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );


  if (!session && !isPublic) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }


  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};