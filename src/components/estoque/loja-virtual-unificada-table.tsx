import { createAdminClient } from "@/lib/supabase/admin";
import { LojaVirtualTabelaCliente, type ItemLojaVirtual } from "./loja-virtual-tabela-cliente";

/**
 * Junta as 3 fontes que compõem "o que está de verdade publicado na
 * loja" — antes cada uma só aparecia na sua própria tela, sem um
 * lugar só pra conferir tudo junto. Sempre busca fresco (sem cache),
 * pra refletir publicação que acabou de acontecer pela Central de Cadastro.
 */
async function buscarItensLojaVirtual(): Promise<ItemLojaVirtual[]> {
  const supabase = createAdminClient();

  const [{ data: aparelhos }, { data: modelos }, { data: produtosGenericos }] = await Promise.all([
    supabase
      .from("aparelhos")
      .select("id, cor, memoria, preco_venda, produto:produtos!inner(nome, slug, categoria)")
      .eq("disponivel_loja_virtual", true)
      .eq("status", "disponivel"),
    supabase
      .from("catalogo_lacrados_modelos")
      .select("nome, marca, variantes:catalogo_lacrados_variantes(cor, armazenamento, preco_venda, quantidade, ativo)")
      .eq("ativo", true),
    supabase
      .from("produtos")
      .select("id, nome, slug, categoria, preco_venda")
      .eq("visivel_loja", true)
      // Só exclui iphone/android — esses já têm tela própria (Aparelhos).
      // Toda categoria nova que a IA criar (jbl, videogame, tablet,
      // brinquedo...) aparece aqui automaticamente, sem precisar mexer
      // em código nenhum quando surge uma categoria nova.
      .not("categoria", "in", "(iphone,android)"),
  ]);

  const itensSeminovo: ItemLojaVirtual[] = (aparelhos ?? []).map((a) => {
    const produto = a.produto as unknown as { nome: string; slug: string | null; categoria: string };
    return {
      tipo: "seminovo",
      categoria: produto?.categoria ?? "iphone",
      nome: produto?.nome ?? "—",
      detalhe: [a.memoria, a.cor].filter(Boolean).join(" · "),
      preco: a.preco_venda,
      href: produto?.slug ? `/loja/produto/${produto.slug}` : "#",
    };
  });

  const itensLacrado: ItemLojaVirtual[] = (modelos ?? []).flatMap((m) =>
    (m.variantes ?? [])
      .filter((v) => v.ativo && v.quantidade > 0)
      .map((v) => ({
        tipo: "lacrado" as const,
        categoria: m.marca?.toLowerCase() === "apple" ? "iphone" : "android",
        nome: m.nome,
        detalhe: [v.armazenamento, v.cor].filter(Boolean).join(" · "),
        preco: v.preco_venda,
        href: `/loja/lacrados/${m.nome.toLowerCase().replace(/\s+/g, "-")}`,
      }))
  );

  const itensGenericos: ItemLojaVirtual[] = (produtosGenericos ?? []).map((p) => ({
    tipo: "produto",
    categoria: p.categoria,
    nome: p.nome,
    detalhe: p.categoria,
    preco: p.preco_venda,
    href: p.slug ? `/loja/produto/${p.slug}` : "#",
  }));

  return [...itensSeminovo, ...itensLacrado, ...itensGenericos];
}

export async function LojaVirtualUnificadaTable() {
  const itens = await buscarItensLojaVirtual();
  return <LojaVirtualTabelaCliente itens={itens} />;
}
