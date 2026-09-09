import { createClient } from "@/lib/supabase/server";
import { buscarOSPorId, listarChecklistsPorOS } from "@/services/assistencia/assistencia.service";
import { renderizarTemplate, montarBlocoChecklist, type ItemChecklist } from "./templates-engine";
import { buscarTemplateAtivo } from "./templates.service";
import { gerarQrCodeDataUrl, urlConsultaPublicaOS } from "./qrcode.service";
import { montarHtmlAssinatura } from "./assinatura.service";
import { formatDateTime } from "@/utils";
import type { FormatoImpressao } from "@/types";

const LABELS_CHECKLIST: { campo: string; label: string }[] = [
  { campo: "liga", label: "Liga" },
  { campo: "molhado", label: "Molhado" },
  { campo: "arranhado", label: "Arranhado" },
  { campo: "tela", label: "Tela" },
  { campo: "face_id", label: "Face ID" },
  { campo: "touch", label: "Touch ID" },
  { campo: "botoes", label: "Botões" },
  { campo: "cameras", label: "Câmeras" },
  { campo: "biometria", label: "Biometria" },
  { campo: "microfone", label: "Microfone" },
  { campo: "alto_falante", label: "Alto-falante" },
  { campo: "auricular", label: "Auricular" },
  { campo: "flash", label: "Flash" },
  { campo: "wifi", label: "Wi-Fi" },
  { campo: "bluetooth", label: "Bluetooth" },
  { campo: "carregamento", label: "Carregamento" },
  { campo: "sensor", label: "Sensor" },
  { campo: "vibracao", label: "Vibração" },
];

/**
 * Via cliente tem QR Code, via loja não — decisão explícita do pedido.
 * `viaCliente` decide isso; o resto do documento é idêntico nas duas vias.
 */
export async function montarHtmlImpressaoOS(id: string, formato: FormatoImpressao, viaCliente: boolean): Promise<string | null> {
  const os = await buscarOSPorId(id);
  if (!os) return null;

  const supabase = await createClient();
  const [checklists, aparelho, template, assinaturaCliente, assinaturaTecnico] = await Promise.all([
    listarChecklistsPorOS(id),
    os.aparelho_id
      ? supabase.from("aparelhos").select("imei, numero_serie").eq("id", os.aparelho_id).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
    buscarTemplateAtivo("os", formato),
    montarHtmlAssinatura("os", id, "cliente"),
    montarHtmlAssinatura("os", id, "tecnico"),
  ]);

  if (!template) return null;

  const checklistRecebimento = checklists.find((c) => c.tipo === "recebimento");
  const itensChecklist: ItemChecklist[] = LABELS_CHECKLIST.map(({ campo, label }) => ({
    label,
    valor: checklistRecebimento ? (checklistRecebimento as unknown as Record<string, boolean | null>)[campo] : null,
  }));

  const qrCodeHtml = viaCliente
    ? `<img src="${await gerarQrCodeDataUrl(urlConsultaPublicaOS())}" alt="QR Code" style="width:80px;height:80px;" />`
    : "";

  const ORIGEM_LABEL: Record<string, string> = {
    indicacao: "Indicação", porta_de_loja: "Porta de loja", instagram: "Instagram",
    anuncio: "Anúncio", cliente_antigo: "Cliente antigo",
  };

  const LABEL_METODO: Record<string, string> = { pix: "Pix", cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito", dinheiro: "Dinheiro", boleto: "Boleto" };

  function labelFormaPagamento(forma: string): string {
    if (forma === "misto") return "Misto";
    const [base, parcelasTag] = forma.split("_credito_");
    if (base === "cartao" && parcelasTag) return `Cartão de crédito — ${parcelasTag}`;
    return LABEL_METODO[forma] ?? forma;
  }

  let blocoDetalhamentoMisto = "";
  if (os.forma_pagamento === "misto") {
    const { data: pagamentos } = await supabase.from("os_pagamentos").select("metodo, valor").eq("os_id", id);
    if (pagamentos && pagamentos.length > 0) {
      const linhas = pagamentos.map((p) => `<div>${LABEL_METODO[p.metodo] ?? p.metodo}: R$ ${Number(p.valor).toFixed(2)}</div>`).join("");
      blocoDetalhamentoMisto = `<div style="font-size:11px; margin-top:4px; padding-left:8px; border-left:2px solid #0F7A3D;">${linhas}</div>`;
    }
  }

  const blocoOrcamento = os.valor && !os.forma_pagamento
    ? `<div style="background:#FDF3E7; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px;">
        <strong>Orçamento do reparo:</strong> R$ ${Number(os.valor).toFixed(2)}
        <div style="font-size:10px; color:#B45F04; margin-top:2px;">Sujeito a confirmação — valor final só é definido ao concluir o serviço.</div>
      </div>`
    : "";

  const blocoPagamento = os.forma_pagamento
    ? `<div style="background:#f0fdf4; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px;">
        <strong>Pagamento:</strong> ${labelFormaPagamento(os.forma_pagamento)}
        ${os.valor_cobrado ? ` — R$ ${Number(os.valor_cobrado).toFixed(2)}` : ""}
        ${blocoDetalhamentoMisto}
      </div>`
    : "";

  return renderizarTemplate(template.conteudo_html, {
    loja_nome: "NEOTEC TECNOLOGIA E ACESSÓRIOS LTDA",
    numero_documento: os.numero_os,
    data_emissao: formatDateTime(os.data_entrada),
    cliente_nome: os.cliente.nome,
    cliente_whatsapp: os.cliente.whatsapp,
    aparelho_modelo: os.aparelho_descricao ?? "—",
    aparelho_imei: aparelho?.imei ?? "—",
    aparelho_serie: aparelho?.numero_serie ?? "—",
    aparelho_senha: checklistRecebimento?.senha_valor ?? "—",
    defeito: os.defeito,
    diagnostico: os.diagnostico ?? os.diagnostico_inicial ?? "Ainda não diagnosticado",
    checklist: montarBlocoChecklist(itensChecklist),
    observacoes: checklistRecebimento?.observacoes ?? "—",
    garantia: os.garantia_dias ? `${os.garantia_dias} dias após a entrega` : "Sem garantia definida",
    origem_cliente: os.origem_cliente ? ORIGEM_LABEL[os.origem_cliente] ?? "—" : "—",
    bloco_orcamento: blocoOrcamento,
    bloco_pagamento: blocoPagamento,
    qr_code: qrCodeHtml,
    assinatura_cliente: assinaturaCliente,
    assinatura_tecnico: assinaturaTecnico,
  });
}
