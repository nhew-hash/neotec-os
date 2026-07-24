import { createClient } from "@/lib/supabase/server";
import { renderizarTemplate } from "./templates-engine";
import { buscarTemplateAtivo } from "./templates.service";
import { gerarQrCodeDataUrl } from "./qrcode.service";
import { formatCurrency, formatDate, formatDateTime } from "@/utils";

export async function montarHtmlImpressaoOrcamento(id: string, viaCliente: boolean): Promise<string | null> {
  const supabase = await createClient();

  const [{ data: orcamento }, { data: itens }, template] = await Promise.all([
    supabase.from("orcamentos").select("*, cliente:clientes(id, nome, whatsapp)").eq("id", id).maybeSingle(),
    supabase
      .from("orcamento_itens")
      .select("quantidade, valor, produto:produtos(nome), aparelho:aparelhos(imei, produto:produtos(nome))")
      .eq("orcamento_id", id),
    buscarTemplateAtivo("orcamento", "a4"),
  ]);

  if (!orcamento || !template) return null;

  const itensHtml = (itens ?? [])
    .map((item) => {
      const produto = item.produto as unknown as { nome: string } | null;
      const aparelho = item.aparelho as unknown as { imei: string; produto: { nome: string } } | null;
      const nome = produto?.nome ?? aparelho?.produto?.nome ?? "Item";
      const detalhe = aparelho ? ` (IMEI ${aparelho.imei})` : "";
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;">
        <span>${item.quantidade}x ${nome}${detalhe}</span>
        <span>${formatCurrency(item.valor)}</span>
      </div>`;
    })
    .join("");

  const qrCodeHtml = viaCliente
    ? `<img src="${await gerarQrCodeDataUrl(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://neotecos.vercel.app"}/consultar-os`)}" alt="QR Code" style="width:80px;height:80px;" />`
    : "";

  return renderizarTemplate(template.conteudo_html, {
    loja_nome: "NEOTEC ARAGUARI",
    numero_documento: orcamento.id.slice(0, 8).toUpperCase(),
    data_emissao: formatDateTime(orcamento.data_criacao),
    cliente_nome: orcamento.cliente.nome,
    cliente_whatsapp: orcamento.cliente.whatsapp,
    itens: itensHtml || "Nenhum item",
    garantia: orcamento.garantia_dias ? `${orcamento.garantia_dias} dias` : "A combinar",
    prazo: orcamento.validade ? formatDate(orcamento.validade) : "Sem validade definida",
    valor: formatCurrency(orcamento.valor),
    qr_code: qrCodeHtml,
  });
}
