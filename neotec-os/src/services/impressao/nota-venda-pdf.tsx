import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/utils";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d29" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logo: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#2643D6", color: "#fff", textAlign: "center", paddingTop: 10, fontSize: 16, fontFamily: "Helvetica-Bold" },
  lojaNome: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  lojaSub: { fontSize: 8, color: "#8a8f9c" },
  badge: { backgroundColor: "#EEF1FB", color: "#2643D6", fontSize: 10, fontFamily: "Helvetica-Bold", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignSelf: "flex-end" },
  hr: { height: 1, backgroundColor: "#E4E7EF", marginBottom: 16 },
  sectionLabel: { fontSize: 8, textTransform: "uppercase", color: "#8a8f9c", fontFamily: "Helvetica-Bold", marginBottom: 4 },
  box: { backgroundColor: "#FAFBFC", borderRadius: 8, padding: 10, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E4E7EF", paddingBottom: 6, marginBottom: 6 },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F3F4F7" },
  colItem: { flex: 3 }, colQtd: { flex: 1, textAlign: "center" }, colValor: { flex: 1, textAlign: "right" },
  totalBox: { backgroundColor: "#2643D6", borderRadius: 8, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  totalLabel: { color: "#DCE3FA", fontSize: 9, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  totalValor: { color: "#fff", fontSize: 18, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, textAlign: "center", fontSize: 7, color: "#b3b7c2" },
});

interface DadosNotaVenda {
  numero: string;
  data: string;
  clienteNome: string;
  clienteWhatsapp: string | null;
  itens: { nome: string; quantidade: number; valor: number }[];
  desconto: number;
  cashbackUtilizado: number;
  total: number;
  formaPagamento: string;
  garantiaDias: number | null;
}

function NotaVendaDocument({ dados }: { dados: DadosNotaVenda }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={styles.logo}>N</Text>
            <View>
              <Text style={styles.lojaNome}>NEOTEC ARAGUARI</Text>
              <Text style={styles.lojaSub}>Assistência técnica especializada</Text>
            </View>
          </View>
          <View>
            <Text style={styles.badge}>Nota de Venda {dados.numero}</Text>
            <Text style={{ fontSize: 8, color: "#8a8f9c", marginTop: 4, textAlign: "right" }}>{dados.data}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.box}>
          <Text style={styles.sectionLabel}>Cliente</Text>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{dados.clienteNome}</Text>
          {dados.clienteWhatsapp && <Text style={{ fontSize: 9, color: "#5b6072" }}>{dados.clienteWhatsapp}</Text>}
        </View>

        <Text style={styles.sectionLabel}>Itens</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colItem, { fontFamily: "Helvetica-Bold" }]}>Item</Text>
          <Text style={[styles.colQtd, { fontFamily: "Helvetica-Bold" }]}>Qtd</Text>
          <Text style={[styles.colValor, { fontFamily: "Helvetica-Bold" }]}>Valor</Text>
        </View>
        {dados.itens.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colItem}>{item.nome}</Text>
            <Text style={styles.colQtd}>{item.quantidade}</Text>
            <Text style={styles.colValor}>{formatCurrency(item.valor * item.quantidade)}</Text>
          </View>
        ))}

        <View style={{ marginTop: 12 }}>
          {dados.desconto > 0 && (
            <View style={styles.row}><Text style={{ color: "#5b6072" }}>Desconto</Text><Text style={{ color: "#5b6072" }}>-{formatCurrency(dados.desconto)}</Text></View>
          )}
          {dados.cashbackUtilizado > 0 && (
            <View style={styles.row}><Text style={{ color: "#5b6072" }}>Cashback usado</Text><Text style={{ color: "#5b6072" }}>-{formatCurrency(dados.cashbackUtilizado)}</Text></View>
          )}
          <View style={styles.row}><Text style={{ color: "#5b6072" }}>Forma de pagamento</Text><Text style={{ color: "#5b6072" }}>{dados.formaPagamento}</Text></View>
          {dados.garantiaDias != null && (
            <View style={styles.row}><Text style={{ color: "#5b6072" }}>Garantia</Text><Text style={{ color: "#5b6072" }}>{dados.garantiaDias} dias</Text></View>
          )}
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValor}>{formatCurrency(dados.total)}</Text>
        </View>

        <Text style={styles.footer}>Documento gerado pelo Neotec OS em {dados.data} — não substitui nota fiscal eletrônica.</Text>
      </Page>
    </Document>
  );
}

/**
 * PDF de verdade (arquivo baixável), diferente da impressão em HTML já
 * existente — usa @react-pdf/renderer, que roda em Node puro (sem
 * precisar de navegador/Puppeteer, mais leve e confiável em ambiente
 * serverless como a Vercel).
 */
export async function gerarNotaVendaPDF(vendaId: string): Promise<Buffer | null> {
  const supabase = await createClient();

  const [{ data: venda }, { data: itensRaw }, { data: vendaCampos }] = await Promise.all([
    supabase.from("vw_vendas_seguro").select("*, cliente:clientes(nome, whatsapp)").eq("id", vendaId).maybeSingle(),
    supabase
      .from("venda_itens")
      .select("quantidade, valor, produto:produtos(nome), aparelho:aparelhos(imei, produto:produtos(nome))")
      .eq("venda_id", vendaId),
    // Busca direto da tabela (não da view) — garantia/cashback/indicação
    // não são dado sensível, mas não sei se a view já foi atualizada
    // pra incluir esses campos novos, então não arrisco depender dela.
    supabase.from("vendas").select("garantia_dias, cashback_utilizado, cashback_concedido").eq("id", vendaId).maybeSingle(),
  ]);

  if (!venda) return null;

  const itens = (itensRaw ?? []).map((item) => {
    const produto = item.produto as unknown as { nome: string } | null;
    const aparelho = item.aparelho as unknown as { imei: string; produto: { nome: string } } | null;
    const nome = produto?.nome ?? aparelho?.produto?.nome ?? "Item";
    return { nome: aparelho ? `${nome} (IMEI ${aparelho.imei})` : nome, quantidade: item.quantidade, valor: item.valor };
  });

  const dados: DadosNotaVenda = {
    numero: venda.id.slice(0, 8).toUpperCase(),
    data: formatDateTime(venda.data_venda),
    clienteNome: venda.cliente?.nome ?? "Cliente balcão",
    clienteWhatsapp: venda.cliente?.whatsapp ?? null,
    itens,
    desconto: venda.desconto ?? 0,
    cashbackUtilizado: vendaCampos?.cashback_utilizado ?? 0,
    total: venda.valor_total,
    formaPagamento: venda.forma_pagamento,
    garantiaDias: vendaCampos?.garantia_dias ?? null,
  };

  return renderToBuffer(<NotaVendaDocument dados={dados} />);
}
