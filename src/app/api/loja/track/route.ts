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
    const { tipo, sessaoUid, pagina, produtoId, aparelhoId, origem } = body as {
      tipo: "pageview" | "add_to_cart" | "ping" | "checkout_view" | "checkout_started" | "payment_selected" | "payment_success" | "payment_failed";
      sessaoUid: string;
      pagina?: string;
      produtoId?: string;
      aparelhoId?: string;
      origem?: string;
    };

    if (!sessaoUid) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = createAdminClient();

    await supabase.from("loja_sessoes").upsert(
      {
        sessao_uid: sessaoUid,
        origem: origem || undefined,
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
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
