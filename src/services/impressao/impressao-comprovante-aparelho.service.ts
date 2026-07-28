import { createClient } from "@/lib/supabase/server";
import { renderizarTemplate } from "./templates-engine";
import { buscarTemplateAtivo } from "./templates.service";
import { gerarQrCodeDataUrl, urlConsultaPublicaOS } from "./qrcode.service";
import { formatCurrency, formatDateTime } from "@/utils";

/**
 * Comprovante de compra — documento específico pra venda de aparelho
 * (iPhone/Android), diferente da nota de venda genérica. Puxa
 * automaticamente cliente + dados do aparelho (modelo, cor, memória,
 * IMEI, condição). Entrada/saldo/garantia/observações são
 * preenchidos pela equipe na hora de emitir — não existe como campo
 * estruturado em `vendas` ainda, então fica igual "condições da
 * garantia" já funcionava nos outros documentos.
 */
export async function montarHtmlComprovanteAparelho(input: {
  vendaId: string;
  entrada?: number;
  saldo?: number;
  garantia?: string;
  observacoes?: string;
}): Promise<string | null> {
  const supabase = await createClient();

  const { data: itemAparelho } = await supabase.from("venda_itens").select("aparelho_id").eq("venda_id", input.vendaId).not("aparelho_id", "is", null).limit(1).maybeSingle();
  if (!itemAparelho?.aparelho_id) return null; // venda sem aparelho vinculado — esse documento não se aplica

  const [{ data: venda }, { data: aparelho }, template] = await Promise.all([
    supabase.from("vw_vendas_seguro").select("*, cliente:clientes(nome, cpf, whatsapp, endereco)").eq("id", input.vendaId).maybeSingle(),
    supabase.from("aparelhos").select("imei, cor, memoria, condicao, produto:produtos(nome)").eq("id", itemAparelho.aparelho_id).maybeSingle(),
    buscarTemplateAtivo("comprovante_aparelho", "a4"),
  ]);

  if (!venda || !aparelho || !template) return null;

  const cliente = venda.cliente as unknown as { nome: string; cpf: string | null; whatsapp: string; endereco: string | null } | null;
  const produtoAparelho = aparelho.produto as unknown as { nome: string } | null;

  const qrCodeHtml = `<img src="${await gerarQrCodeDataUrl(urlConsultaPublicaOS())}" alt="QR Code" style="width:100px;height:100px;margin:0 auto;display:block;" />`;

  return renderizarTemplate(template.conteudo_html, {
    loja_nome: "NEOTEC BRASIL",
    numero_documento: venda.id.slice(0, 6).toUpperCase(),
    data_emissao: formatDateTime(venda.data_venda),
    cliente_nome: cliente?.nome ?? "—",
    cliente_cpf: cliente?.cpf ?? "—",
    cliente_whatsapp: cliente?.whatsapp ?? "—",
    cliente_endereco: cliente?.endereco ?? "—",
    aparelho_modelo: produtoAparelho?.nome ?? "—",
    aparelho_cor: aparelho.cor ?? "—",
    aparelho_memoria: aparelho.memoria ?? "—",
    aparelho_imei: aparelho.imei ?? "—",
    aparelho_estado: aparelho.condicao === "novo" ? "Lacrado" : "Seminovo",
    valor_aparelho: formatCurrency(venda.valor_total),
    valor_entrada: input.entrada != null ? formatCurrency(input.entrada) : "—",
    valor_saldo: input.saldo != null ? formatCurrency(input.saldo) : "—",
    forma_pagamento: venda.forma_pagamento,
    garantia: input.garantia || "Garantia de 90 dias contra defeito de fabricação, conforme Código de Defesa do Consumidor. Não cobre danos físicos, líquidos ou mau uso.",
    observacoes: input.observacoes || "Cliente conferiu o IMEI e as condições do aparelho no ato da compra.",
    qr_code: qrCodeHtml,
  });
}
