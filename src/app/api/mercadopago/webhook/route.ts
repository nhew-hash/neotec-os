import { NextResponse, type NextRequest } from "next/server";
import { webhookService } from "@/services/pagamentos/webhook.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await webhookService.processarNotificacao(body);
    return NextResponse.json({ recebido: true });
  } catch (err) {
    // Devolve 200 mesmo em erro — o Mercado Pago reenvia em retry se
    // receber erro, o que só duplicaria o problema; fica no log da função.
    console.error("Erro no webhook do Mercado Pago:", err);
    return NextResponse.json({ recebido: true });
  }
}
