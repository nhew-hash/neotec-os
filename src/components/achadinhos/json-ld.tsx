/** JSON-LD pra buscadores. O `<` é escapado: texto de produto jamais pode fechar a tag <script>. */
export function JsonLd({ dados }: { dados: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />;
}
