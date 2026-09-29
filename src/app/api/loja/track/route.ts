import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Endpoint único de rastreamento da loja — pageview, add_to_cart e
 * ping de presença ("online agora"). Público (sem login, é a loja),
 * mas nunca guarda dado pessoal — só o UID de sessão gerado no
 * navegador (aleatório, sem relação com CPF/nome/telefone).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, sessaoUid, pagina, produtoId, aparelhoId, lacradoModeloId, origem, utmMedium, utmCampaign } = body as {
      tipo: "pageview" | "product_view" | "add_to_cart" | "comprar_agora_click" | "ping" | "checkout_view" | "checkout_started" | "payment_selected" | "payment_success" | "payment_failed";
      sessaoUid: string;
      pagina?: string;
      produtoId?: string;
      aparelhoId?: string;
      lacradoModeloId?: string;
      origem?: string;
      utmMedium?: string | null;
      utmCampaign?: string | null;
    };

    if (!sessaoUid) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = createAdminClient();

    await supabase.from("loja_sessoes").upsert(
      {
        sessao_uid: sessaoUid,
        origem: origem || undefined,
        // Fase 255 — utm_medium/utm_campaign chegavam na URL e eram
        // descartados (só utm_source virava `origem`). `?? undefined`
        // (não `||`) porque `null` é um valor válido aqui (campanha sem
        // esses parâmetros) e não pode ser confundido com "não veio
        // nesta requisição" (que é quando o client nem manda a chave).
        utm_medium: utmMedium === undefined ? undefined : utmMedium,
        utm_campaign: utmCampaign === undefined ? undefined : utmCampaign,
        primeira_pagina: pagina || undefined,
        ultima_atividade_em: new Date().toISOString(),
      },
      { onConflict: "sessao_uid", ignoreDuplicates: false }
    );

    if (tipo !== "ping") {
      await supabase.from("loja_eventos").insert({
        sessao_uid: sessaoUid,
        tipo,
        pagina: pagina || null,
        produto_id: produtoId || null,
        aparelho_id: aparelhoId || null,
        lacrado_modelo_id: lacradoModeloId || null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
