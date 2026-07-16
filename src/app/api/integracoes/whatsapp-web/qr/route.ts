import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";

/**
 * O Bridge chama isso a cada QR Code novo gerado (o QR do WhatsApp Web
 * expira e é renovado periodicamente enquanto não é escaneado).
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body = await request.json();
  const qrCode = body.qrCode as string;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("integracoes_whatsapp")
    .update({ qr_code: qrCode, status: "aguardando_qr" })
    .eq("provider", "whatsapp_web");

  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
