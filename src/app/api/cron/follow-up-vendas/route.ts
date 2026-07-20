import { NextResponse, type NextRequest } from "next/server";
import { processarFollowupsDeVenda } from "@/services/ia/followup-vendas.service";

/**
 * Chamada pelo Vercel Cron (ver vercel.json) — nunca pelo navegador.
 * Autenticada pelo header que a própria Vercel envia quando CRON_SECRET
 * está configurada (não é uma rota pública, mesmo sem sessão de usuário).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const resultado = await processarFollowupsDeVenda();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error("Falha ao processar follow-ups de venda:", err);
    return NextResponse.json(
      { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
