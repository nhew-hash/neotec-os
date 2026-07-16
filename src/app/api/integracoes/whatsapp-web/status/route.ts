import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";
import type { StatusConexaoWhatsapp } from "@/types";

/**
 * O Bridge chama isso sempre que o status da conexão muda (conectando,
 * aguardando_qr, conectado, erro, desconectado). Autenticado por segredo
 * compartilhado, não por sessão de usuário — é chamada servidor-a-servidor.
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body = await request.json();
  const status = body.status as StatusConexaoWhatsapp;
  const numero = body.numero as string | undefined;
  const erro = body.erro as string | undefined;

  const supabase = createAdminClient();

  const update: Record<string, unknown> = { status };
  if (numero) update.numero = numero;
  if (status === "conectado") update.ultima_conexao = new Date().toISOString();
  update.ultimo_erro = status === "erro" ? (erro ?? "Erro não especificado") : null;

  const { error } = await supabase.from("integracoes_whatsapp").update(update).eq("provider", "whatsapp_web");

  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
