import Link from "next/link";
import { Smartphone, Sparkles as SparklesIcon, Package } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/utils";

interface ItemLojaVirtual {
  tipo: "seminovo" | "lacrado" | "produto";
  nome: string;
  detalhe: string;
  preco: number | null;
  href: string;
}

const LABEL_TIPO: Record<ItemLojaVirtual["tipo"], { label: string; icon: typeof Smartphone; cor: string }> = {
  seminovo: { label: "Seminovo", icon: Smartphone, cor: "bg-primary/10 text-primary" },
  lacrado: { label: "Lacrado", icon: SparklesIcon, cor: "bg-success/10 text-success" },
  produto: { label: "Produto", icon: Package, cor: "bg-warning/10 text-warning" },
};

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
      .select("id, cor, memoria, preco_venda, produto:produtos!inner(nome, slug)")
      .eq("disponivel_loja_virtual", true)
      .eq("status", "disponivel"),
    supabase
      .from("catalogo_lacrados_modelos")
      .select("nome, variantes:catalogo_lacrados_variantes(cor, armazenamento, preco_venda, quantidade, ativo)")
      .eq("ativo", true),
    supabase
      .from("produtos")
      .select("id, nome, slug, categoria, preco_venda")
      .eq("visivel_loja", true)
      .in("categoria", ["ipad", "mac", "apple_watch", "acessorio"]),
  ]);

  const itensSeminovo: ItemLojaVirtual[] = (aparelhos ?? []).map((a) => {
    const produto = a.produto as unknown as { nome: string; slug: string | null };
    return {
      tipo: "seminovo",
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
        nome: m.nome,
        detalhe: [v.armazenamento, v.cor].filter(Boolean).join(" · "),
        preco: v.preco_venda,
        href: `/loja/lacrados/${m.nome.toLowerCase().replace(/\s+/g, "-")}`,
      }))
  );

  const itensGenericos: ItemLojaVirtual[] = (produtosGenericos ?? []).map((p) => ({
    tipo: "produto",
    nome: p.nome,
    detalhe: p.categoria,
    preco: p.preco_venda,
    href: p.slug ? `/loja/produto/${p.slug}` : "#",
  }));

  return [...itensSeminovo, ...itensLacrado, ...itensGenericos];
}

export async function LojaVirtualUnificadaTable() {
  const itens = await buscarItensLojaVirtual();

  if (itens.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nada publicado na loja virtual ainda.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Detalhe</TableHead>
          <TableHead>Preço</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.map((item, i) => {
          const tipo = LABEL_TIPO[item.tipo];
          return (
            <TableRow key={i}>
              <TableCell><Badge className={tipo.cor}><tipo.icon className="h-3 w-3" />{tipo.label}</Badge></TableCell>
              <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.detalhe}</TableCell>
              <TableCell>{item.preco ? formatCurrency(item.preco) : "—"}</TableCell>
              <TableCell>
                {item.href !== "#" && (
                  <Link href={item.href} target="_blank" className="text-xs font-medium text-primary hover:underline">Ver na loja →</Link>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
