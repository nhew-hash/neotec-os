import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `whatsapp_mensagens.url_midia` guarda só o CAMINHO dentro do bucket
 * (não uma URL final) — porque link assinado expira, e guardar link
 * fixo no banco significaria ele ficar inválido depois de um tempo, ou
 * o bucket precisar ser público (não queremos isso pra conversa de
 * cliente). Essa rota gera o link válido na hora, sob demanda, e
 * redireciona pra ele — o `<img>`/`<audio>` no chat só aponta pra cá.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const path = request.nextUrl.searchParams.get("path");
  if (!path) return new NextResponse("Caminho não informado", { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("whatsapp-media").createSignedUrl(path, 300); // 5 minutos — só o tempo de carregar a imagem/áudio na tela

  if (error || !data) {
    return new NextResponse("Mídia não encontrada", { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
