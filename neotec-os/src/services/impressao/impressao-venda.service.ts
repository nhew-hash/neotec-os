import { createClient } from "@/lib/supabase/server";
import { renderizarTemplate } from "./templates-engine";
import { buscarTemplateAtivo } from "./templates.service";
import { gerarQrCodeDataUrl, urlConsultaPublicaOS } from "./qrcode.service";
import { formatCurrency, formatDateTime } from "@/utils";

const NOME_FANTASIA = "NEOTEC TECNOLOGIA E ACESSÓRIOS LTDA";

async function montarItensVendaHtml(vendaId: string): Promise<string> {
  const supabase = await createClient();
  const { data: itens } = await supabase
    .from("venda_itens")
    .select("quantidade, valor, produto:produtos(nome), aparelho:aparelhos(imei, produto:produtos(nome))")
    .eq("venda_id", vendaId);

  return (itens ?? [])
    .map((item) => {
      const produto = item.produto as unknown as { nome: string } | null;
      const aparelho = item.aparelho as unknown as { imei: string; produto: { nome: string } } | null;
      const nome = produto?.nome ?? aparelho?.produto?.nome ?? "Item";
      return `<div>${item.quantidade}x ${nome} — ${formatCurrency(item.valor)}</div>`;
    })
    .join("");
}

export async function montarHtmlImpressaoVenda(id: string, viaCliente: boolean): Promise<string | null> {
  const supabase = await createClient();

  const [{ data: venda }, itensHtml, template] = await Promise.all([
    supabase.from("vw_vendas_seguro").select("*, cliente:clientes(id, nome, whatsapp)").eq("id", id).maybeSingle(),
    montarItensVendaHtml(id),
    buscarTemplateAtivo("venda", "cupom"),
  ]);

  if (!venda || !template) return null;

  const qrCodeHtml = viaCliente
    ? `<img src="${await gerarQrCodeDataUrl(urlConsultaPublicaOS())}" alt="QR Code" style="width:100px;height:100px;margin:0 auto;display:block;" />`
    : "";

  return renderizarTemplate(template.conteudo_html, {
    loja_nome: NOME_FANTASIA,
    numero_documento: venda.id.slice(0, 8).toUpperCase(),
    data_emissao: formatDateTime(venda.data_venda),
    itens: itensHtml || "Nenhum item",
    valor: formatCurrency(venda.valor_total),
    forma_pagamento: venda.forma_pagamento,
    garantia: "Consulte a garantia de cada item na nota",
    qr_code: qrCodeHtml,
  });
}

/** Recibo reaproveita os mesmos dados da venda — layout mais enxuto (Cliente, Valor, Data, Forma de pagamento, Responsável, QR). */
export async function montarHtmlImpressaoRecibo(vendaId: string, viaCliente: boolean): Promise<string | null> {
  const supabase = await createClient();

  const [{ data: venda }, template, { data: { user } }] = await Promise.all([
    supabase.from("vw_vendas_seguro").select("*, cliente:clientes(id, nome, whatsapp)").eq("id", vendaId).maybeSingle(),
    buscarTemplateAtivo("recibo", "cupom"),
    supabase.auth.getUser(),
  ]);

  if (!venda || !template) return null;

  let nomeResponsavel = "—";
  if (user) {
    const { data: perfil } = await supabase.from("usuarios").select("nome").eq("id", user.id).maybeSingle();
    nomeResponsavel = perfil?.nome ?? "—";
  }

  const qrCodeHtml = viaCliente
    ? `<img src="${await gerarQrCodeDataUrl(urlConsultaPublicaOS())}" alt="QR Code" style="width:100px;height:100px;margin:0 auto;display:block;" />`
    : "";

  return renderizarTemplate(template.conteudo_html, {
    loja_nome: NOME_FANTASIA,
    cliente_nome: venda.cliente?.nome ?? "Cliente balcão",
    data_emissao: formatDateTime(venda.data_venda),
    responsavel: nomeResponsavel,
    valor: formatCurrency(venda.valor_total),
    forma_pagamento: venda.forma_pagamento,
    qr_code: qrCodeHtml,
  });
}
