import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d29", lineHeight: 1.5 },
  avisoRascunho: { backgroundColor: "#FDF3E7", border: "1pt solid #D97706", borderRadius: 6, padding: 10, marginBottom: 20 },
  avisoTexto: { color: "#B45F04", fontFamily: "Helvetica-Bold", fontSize: 9 },
  numero: { fontSize: 8, color: "#8a8f9c", textAlign: "right", marginBottom: 10 },
  paragrafo: { marginBottom: 8 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, textAlign: "center", fontSize: 7, color: "#b3b7c2" },
});

/**
 * Renderiza o texto já resolvido do contrato (placeholders e blocos
 * condicionais já substituídos) como PDF simples, parágrafo por
 * parágrafo. Formatação deliberadamente simples — o CONTEÚDO jurídico
 * vem do modelo, esse componente só imprime, nunca decide redação.
 */
export async function gerarPdfContrato(input: { numeroContrato: string; textoRenderizado: string; modeloRevisadoJuridicamente: boolean }): Promise<Buffer> {
  const paragrafos = input.textoRenderizado.split("\n").filter((p) => p.trim().length > 0 || p === "");

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {!input.modeloRevisadoJuridicamente && (
          <View style={styles.avisoRascunho}>
            <Text style={styles.avisoTexto}>⚠ MODELO PARA REVISÃO JURÍDICA — NÃO UTILIZAR EM PRODUÇÃO ATÉ APROVAÇÃO DO ADVOGADO</Text>
          </View>
        )}
        <Text style={styles.numero}>Contrato {input.numeroContrato}</Text>
        {paragrafos.map((paragrafo, i) => (
          <Text key={i} style={styles.paragrafo}>{paragrafo || " "}</Text>
        ))}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
