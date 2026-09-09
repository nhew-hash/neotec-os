import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bridge da Prostec chama sempre que o status da conexão muda. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bridge-secret");
  if (!secret || secret !== process.env.WHATSAPP_PROSTEC_BRIDGE_SECRET) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body = await request.json();
  const status = body.status as string;
  const numero = body.numero as string | undefined;
  const erro = body.erro as string | undefined;

  const admin = createAdminClient();
  const { data: linha } = await admin.from("integracoes_whatsapp_prostec").select("id").maybeSingle();
  if (!linha) return NextResponse.json({ ok: false, erro: "Configuração não encontrada" }, { status: 500 });

  const update: Record<string, unknown> = { status, ultimo_erro: status === "erro" ? (erro ?? "Erro não especificado") : null };
  if (numero) update.numero = numero;
  if (status === "conectado") update.ultima_conexao = new Date().toISOString();

  const { error } = await admin.from("integracoes_whatsapp_prostec").update(update).eq("id", linha.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
