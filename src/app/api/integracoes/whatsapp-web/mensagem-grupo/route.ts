import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { processarMensagemFornecedor } from "@/services/importacao-fornecedores/orquestrador";
import { aplicarListaFornecedor } from "@/services/importacao-fornecedores/aplicacao.service";
import { montarResumoWhatsApp } from "@/services/importacao-fornecedores/resumo";
import { WhatsAppWebProvider } from "@/services/whatsapp/providers/whatsapp-web.provider";
import type { Fornecedor } from "@/services/importacao-fornecedores/classificador";

interface CorpoMensagemGrupo {
  grupoId: string;
  nomeGrupo?: string;
  autor: string;
  autorConfiavel: boolean;
  autorNome?: string;
  tipo: "texto" | "imagem" | "documento" | "audio";
  conteudo: string;
  idExterno: string;
  encaminhada: boolean;
}

const FORNECEDORES_VALIDOS: Fornecedor[] = ["goat", "realeza"];

/**
 * O Bridge chama isso pra toda mensagem de GRUPO (comunidade), quando a
 * instância roda com `PROCESSAR_GRUPOS=true` — mesma instância/número já
 * usado pro CRM (loja), não uma segunda instância dedicada. A maioria
 * dos grupos que essa mesma conta participa NUNCA vai estar cadastrada
 * em `import_fontes`, então isso ignora silenciosamente qualquer grupo
 * não configurado como fonte de fornecedor (só registra o grupo como
 * rascunho pra aparecer na tela de configuração).
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body: CorpoMensagemGrupo = await request.json();
  const admin = createAdminClient();

  try {
    const { data: fonte } = await admin.from("import_fontes").select("*").eq("grupo_id", body.grupoId).maybeSingle();

    if (!fonte) {
      // Primeira vez que esse grupo aparece — vira rascunho inativo, só
      // pra você achar fácil na tela de configuração (Estoque > Importação
      // de fornecedores > Fontes) e apontar o fornecedor certo, sem ter
      // que catar o JID no log do servidor.
      await admin.from("import_fontes").insert({
        fornecedor: "desconhecido",
        grupo_id: body.grupoId,
        nome_grupo: body.nomeGrupo ?? null,
        ativo: false,
      });
      return NextResponse.json({ ok: true, ignorado: "grupo_nao_configurado" });
    }

    if (!fonte.ativo || !FORNECEDORES_VALIDOS.includes(fonte.fornecedor as Fornecedor)) {
      return NextResponse.json({ ok: true, ignorado: "fonte_inativa" });
    }

    if (fonte.autores_permitidos?.length && !fonte.autores_permitidos.includes(body.autor)) {
      return NextResponse.json({ ok: true, ignorado: "autor_nao_permitido" });
    }

    if (body.tipo !== "texto" || !body.conteudo) {
      return NextResponse.json({ ok: true, ignorado: "sem_texto" });
    }

    // Idempotência: mesmo id_externo + mesmo conteúdo nunca reprocessa;
    // se a MESMA mensagem foi editada (conteúdo mudou), hash muda e
    // reprocessa — mensagem antiga já aplicada não é desfeita sozinha.
    const hashConteudo = createHash("sha256").update(body.conteudo).digest("hex");
    const { data: jaProcessada } = await admin
      .from("import_mensagens_processadas")
      .select("id")
      .eq("id_externo", body.idExterno)
      .eq("hash_conteudo", hashConteudo)
      .maybeSingle();
    if (jaProcessada) {
      return NextResponse.json({ ok: true, ignorado: "ja_processada" });
    }

    const fornecedor = fonte.fornecedor as Fornecedor;
    const processado = processarMensagemFornecedor(body.conteudo, fornecedor);

    await admin.from("import_mensagens_processadas").insert({
      id_externo: body.idExterno,
      hash_conteudo: hashConteudo,
      fonte_id: fonte.id,
      grupo_id: body.grupoId,
      autor: body.autor,
    });

    if (processado.classificacao !== "lista" || !processado.resultado || !processado.tipoLista) {
      // "ignorar" (comentário solto no grupo) ou "tipo_desconhecido" —
      // não é lista, não faz nada, não precisa responder no grupo.
      return NextResponse.json({ ok: true, classificacao: processado.classificacao });
    }

    const { itens: itensValidos, descartados } = processado.resultado;
    const tipoLista = processado.tipoLista;

    const resultadoAplicacao = await aplicarListaFornecedor(admin, fornecedor, tipoLista, itensValidos, descartados.length);

    const resumo = resultadoAplicacao.bloqueado
      ? `⚠️ ${fornecedor === "goat" ? "Goat" : "Realeza"} — lista recebida mas NÃO aplicada automaticamente (travas de segurança):\n${resultadoAplicacao.motivosBloqueio.map((m) => `• ${m}`).join("\n")}\nRevise manualmente antes de aplicar.`
      : montarResumoWhatsApp(fornecedor, tipoLista, resultadoAplicacao.plano, descartados);

    await admin.from("import_execucoes").insert({
      fonte_id: fonte.id,
      fornecedor,
      tipo_lista: tipoLista,
      mensagem_id_externo: body.idExterno,
      mensagem_bruta: body.conteudo,
      itens_extraidos: itensValidos,
      itens_descartados: descartados,
      diff: {
        entraram: resultadoAplicacao.plano.inserir,
        sairam: resultadoAplicacao.plano.desativar,
        precosMudaram: resultadoAplicacao.plano.atualizarPreco,
      },
      aplicado: resultadoAplicacao.aplicado,
      travada_por_seguranca: resultadoAplicacao.bloqueado,
      motivo_trava: resultadoAplicacao.bloqueado ? resultadoAplicacao.motivosBloqueio.join(" | ") : null,
      snapshot_para_rollback: resultadoAplicacao.itensAtivosAnteriores,
      resumo_whatsapp: resumo,
    });

    // Responde no próprio grupo — é o jeito do dono ver, sem precisar
    // abrir o sistema, que a lista chegou e o que mudou (ou por que não
    // aplicou sozinho).
    await new WhatsAppWebProvider().enviarTexto("", resumo, body.grupoId);

    return NextResponse.json({ ok: true, classificacao: "lista", aplicado: resultadoAplicacao.aplicado, bloqueado: resultadoAplicacao.bloqueado });
  } catch (err) {
    return NextResponse.json(
      { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
