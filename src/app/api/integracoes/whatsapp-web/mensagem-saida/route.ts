import { NextResponse, type NextRequest } from "next/server";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * O WhatsApp marca do mesmo jeito ("fromMe") tanto a mensagem que o
 * Neotec OS mandou quanto a que a equipe respondeu direto pelo celular
 * vinculado — não dá pra distinguir só pela mensagem em si. Por isso
 * checa se já existe uma linha com esse `whatsapp_message_id`: se
 * existir, é eco do próprio envio (já registrado na hora de mandar,
 * ignora). Se não existir depois de algumas tentativas curtas (dá tempo
 * do envio pelo Neotec OS terminar de gravar, evitando falso positivo
 * por corrida), é mensagem nova, vinda do celular direto — grava e
 * pausa a IA (mesma regra de "assumir conversa" que já existe pro envio
 * manual dentro do sistema).
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body = await request.json();
  const { telefone, tipo, conteudo, idExterno } = body as {
    telefone: string; tipo: string; conteudo: string; idExterno: string;
  };

  const supabase = createAdminClient();

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data: existente } = await supabase
      .from("whatsapp_mensagens")
      .select("id")
      .eq("whatsapp_message_id", idExterno)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ ok: true, duplicado: true });
    }
    if (tentativa < 2) await new Promise((resolve) => setTimeout(resolve, 700));
  }

  // Não achou depois de esperar — é mensagem nova, mandada direto do
  // celular, sem passar pelo Neotec OS.
  const { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("id")
    .eq("telefone", telefone)
    .eq("status", "aberta")
    .maybeSingle();

  if (!conversa) {
    // Sem conversa aberta pra esse telefone — nada pra vincular, ignora.
    return NextResponse.json({ ok: true, semConversa: true });
  }

  await supabase.from("whatsapp_mensagens").insert({
    conversa_id: conversa.id,
    direcao: "saida",
    tipo,
    conteudo,
    status_entrega: "entregue",
    whatsapp_message_id: idExterno,
    enviado_por_ia: false,
  });

  await supabase
    .from("whatsapp_conversas")
    .update({ ultima_mensagem_em: new Date().toISOString(), ia_pausada: true })
    .eq("id", conversa.id);

  return NextResponse.json({ ok: true, registradoDoCelular: true });
}
