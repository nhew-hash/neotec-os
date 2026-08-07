import { createClient } from "@/lib/supabase/server";
import { renderizarTemplate } from "./templates-engine";
import { buscarTemplateAtivo } from "./templates.service";
import { gerarQrCodeDataUrl, urlConsultaPublicaOS } from "./qrcode.service";
import { formatCurrency, formatDateTime } from "@/utils";

/**
 * Comprovante de venda completo — cabeçalho fiscal, todos os itens da
 * venda (aparelho + acessórios juntos), resumo financeiro, seção do
 * aparelho quando aplicável, garantia, assinaturas, QR. Funciona pra
 * qualquer venda (só aparelho, só acessório, ou os dois juntos) —
 * a seção "Aparelho" só aparece se a venda tiver um.
 */
export async function montarHtmlComprovanteAparelho(input: {
  vendaId: string;
  entrada?: number;
  saldo?: number;
  garantia?: string;
  observacoes?: string;
}): Promise<string | null> {
  const supabase = await createClient();

  const [{ data: venda }, { data: itens }, template] = await Promise.all([
    supabase.from("vw_vendas_seguro").select("*, cliente:clientes(nome, cpf, whatsapp, endereco), vendedor:usuarios(nome)").eq("id", input.vendaId).maybeSingle(),
    supabase.from("venda_itens").select(`
      quantidade, valor, aparelho_id, produto_id,
      aparelho:aparelhos(imei, numero_serie, cor, memoria, bateria, condicao, produto:produtos(nome)),
      produto:produtos(nome)
    `).eq("venda_id", input.vendaId),
    buscarTemplateAtivo("comprovante_aparelho", "a4"),
  ]);

  if (!venda || !template) return null;

  const cliente = venda.cliente as unknown as { nome: string; cpf: string | null; whatsapp: string; endereco: string | null } | null;
  const vendedor = venda.vendedor as unknown as { nome: string } | null;

  // Monta a tabela de itens — aparelho e acessórios juntos, na mesma lista.
  const linhasItens = (itens ?? [])
    .map((item) => {
      const aparelhoInfo = item.aparelho as unknown as { imei: string | null; produto: { nome: string } | null } | null;
      const produtoInfo = item.produto as unknown as { nome: string } | null;
      const descricao = aparelhoInfo?.produto?.nome ?? produtoInfo?.nome ?? "Item";
      const identificacao = aparelhoInfo?.imei ? `IMEI: ${aparelhoInfo.imei}` : "—";
      const total = item.valor * item.quantidade;
      return `<tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 5px 2px;">${escaparCelula(descricao)}</td>
        <td style="padding: 5px 2px; font-size:10px; color:#666;">${escaparCelula(identificacao)}</td>
        <td style="padding: 5px 2px; text-align:center;">${item.quantidade}</td>
        <td style="padding: 5px 2px; text-align:right;">${formatCurrency(item.valor)}</td>
        <td style="padding: 5px 2px; text-align:right;">${formatCurrency(total)}</td>
      </tr>`;
    })
    .join("");

  // Item de aparelho (se tiver) — só o primeiro, pra montar a seção detalhada.
  const itemAparelho = (itens ?? []).find((i) => i.aparelho_id);
  const aparelhoInfo = itemAparelho?.aparelho as unknown as
    | { imei: string | null; numero_serie: string | null; cor: string | null; memoria: string | null; bateria: number | null; condicao: string; produto: { nome: string } | null }
    | null;

  const blocoAparelho = aparelhoInfo
    ? `<div style="margin-bottom: 12px; clear:both;">
        <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px;">Aparelho</div>
        <div style="font-size: 12px; line-height:1.7;">
          <div><strong>Modelo:</strong> ${escaparCelula(aparelhoInfo.produto?.nome ?? "—")}</div>
          <div><strong>Cor:</strong> ${escaparCelula(aparelhoInfo.cor ?? "—")}</div>
          <div><strong>Armazenamento:</strong> ${escaparCelula(aparelhoInfo.memoria ?? "—")}</div>
          <div><strong>IMEI:</strong> ${escaparCelula(aparelhoInfo.imei ?? "—")}</div>
          <div><strong>Número de série:</strong> ${escaparCelula(aparelhoInfo.numero_serie ?? "—")}</div>
          <div><strong>Estado:</strong> ${aparelhoInfo.condicao === "novo" ? "Lacrado" : "Seminovo"}</div>
          ${aparelhoInfo.bateria != null ? `<div><strong>Saúde da bateria:</strong> ${aparelhoInfo.bateria}%</div>` : ""}
        </div>
      </div>`
    : "";

  const blocoObservacoes = input.observacoes
    ? `<div style="font-size: 11px; line-height:1.6; color:#333; margin-top:6px;"><strong>Observações:</strong> ${escaparCelula(input.observacoes)}</div>`
    : "";

  const subtotal = (itens ?? []).reduce((acc, i) => acc + i.valor * i.quantidade, 0);
  const qrCodeHtml = `<img src="${await gerarQrCodeDataUrl(urlConsultaPublicaOS())}" alt="QR Code" style="width:90px;height:90px;margin:0 auto;display:block;" />`;

  return renderizarTemplate(template.conteudo_html, {
    numero_documento: venda.id.slice(0, 8).toUpperCase(),
    data_emissao: formatDateTime(venda.data_venda),
    vendedor: vendedor?.nome ?? "—",
    cliente_nome: cliente?.nome ?? "—",
    cliente_cpf: cliente?.cpf ?? "—",
    cliente_whatsapp: cliente?.whatsapp ?? "—",
    linhas_itens: linhasItens || "<tr><td colspan=\"5\" style=\"padding:8px; text-align:center; color:#999;\">Nenhum item</td></tr>",
    subtotal: formatCurrency(subtotal),
    desconto: formatCurrency(venda.desconto ?? 0),
    total: formatCurrency(venda.valor_total),
    forma_pagamento: venda.forma_pagamento,
    status: "PAGO",
    bloco_aparelho: blocoAparelho,
    garantia: input.garantia || "Garantia de 90 dias contra defeito de fabricação, conforme Código de Defesa do Consumidor. Não cobre danos físicos, líquidos ou mau uso.",
    bloco_observacoes: blocoObservacoes,
    qr_code: qrCodeHtml,
  });
}

/** Escapa só o necessário pra ir dentro de célula de tabela HTML — os blocos aqui são montados no código (raw HTML via {{{}}}), então preciso escapar manualmente o dado do usuário antes de embutir. */
function escaparCelula(valor: string): string {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
