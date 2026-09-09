import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bridge da Prostec chama isso a cada QR Code novo gerado — segredo PRÓPRIO, nunca o da loja. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bridge-secret");
  if (!secret || secret !== process.env.WHATSAPP_PROSTEC_BRIDGE_SECRET) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body = await request.json();
  const qrCode = body.qrCode as string;

  const admin = createAdminClient();
  const { data: linha } = await admin.from("integracoes_whatsapp_prostec").select("id").maybeSingle();
  if (!linha) return NextResponse.json({ ok: false, erro: "Configuração não encontrada" }, { status: 500 });

  const { error } = await admin.from("integracoes_whatsapp_prostec").update({ qr_code: qrCode, status: "aguardando_qr" }).eq("id", linha.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
