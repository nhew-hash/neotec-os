"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Smartphone, Sparkles as SparklesIcon, Package, Pencil, Check, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/utils";
import { atualizarCategoriaProdutoAction, despublicarTudoLojaVirtualAction } from "@/services/estoque/estoque.actions";

const CATEGORIAS_DISPONIVEIS = ["iphone", "android", "apple_watch", "ipad", "mac", "acessorio", "tablet", "jbl", "videogame"];

export interface ItemLojaVirtual {
  tipo: "seminovo" | "lacrado" | "produto";
  categoria: string;
  nome: string;
  detalhe: string;
  preco: number | null;
  href: string;
  hrefAdmin: string;
  produtoId: string | null; // null pra lacrado — não tem categoria editável
}

const LABEL_TIPO: Record<ItemLojaVirtual["tipo"], { label: string; icon: typeof Smartphone; cor: string }> = {
  seminovo: { label: "Seminovo", icon: Smartphone, cor: "bg-primary/10 text-primary" },
  lacrado: { label: "Lacrado", icon: SparklesIcon, cor: "bg-success/10 text-success" },
  produto: { label: "Produto", icon: Package, cor: "bg-warning/10 text-warning" },
};

function labelCategoriaAdmin(categoria: string): string {
  const conhecidas: Record<string, string> = {
    iphone: "iPhone", android: "Android", apple_watch: "Apple Watch",
    ipad: "iPad", mac: "Mac", acessorio: "Acessórios", tablet: "Tablets",
  };
  // Categoria nova que a IA criou (ex: "jbl", "videogame") — capitaliza
  // e mostra do jeito que foi salva, sem precisar cadastrar rótulo antes.
  return conhecidas[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, " ");
}

/** Corrige categoria direto na tabela — útil quando a IA classificou errado (Fase 149, pedido explícito pra corrigir sem precisar abrir o item). */
function EditorCategoriaInline({ produtoId, categoriaAtual }: { produtoId: string; categoriaAtual: string }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(categoriaAtual);
  const [categoriaExibida, setCategoriaExibida] = useState(categoriaAtual);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    const result = await atualizarCategoriaProdutoAction(produtoId, valor);
    setSalvando(false);
    if (result.success) {
      setCategoriaExibida(valor);
      setEditando(false);
    }
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <select value={valor} onChange={(e) => setValor(e.target.value)} className="rounded border border-border bg-white px-1.5 py-0.5 text-xs">
          {CATEGORIAS_DISPONIVEIS.map((c) => (
            <option key={c} value={c}>{labelCategoriaAdmin(c)}</option>
          ))}
          {!CATEGORIAS_DISPONIVEIS.includes(categoriaExibida) && <option value={categoriaExibida}>{labelCategoriaAdmin(categoriaExibida)}</option>}
        </select>
        <button type="button" onClick={handleSalvar} disabled={salvando} className="text-success hover:opacity-70"><Check className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => { setEditando(false); setValor(categoriaExibida); }} className="text-muted-foreground hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); setEditando(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      {labelCategoriaAdmin(categoriaExibida)}<Pencil className="h-2.5 w-2.5" />
    </button>
  );
}

/** Abas de categoria calculadas a partir do que EXISTE de verdade nos dados — categoria nova (JBL, videogame, o que vier) aparece sozinha, nunca precisa editar essa tela quando surge uma categoria nova. */
export function LojaVirtualTabelaCliente({ itens }: { itens: ItemLojaVirtual[] }) {
  const router = useRouter();
  const [confirmandoDespublicar, setConfirmandoDespublicar] = useState(false);
  const [despublicando, setDespublicando] = useState(false);
  const [resultadoDespublicar, setResultadoDespublicar] = useState<string | null>(null);

  async function handleDespublicarTudo() {
    setDespublicando(true);
    const result = await despublicarTudoLojaVirtualAction();
    setDespublicando(false);
    setConfirmandoDespublicar(false);
    if (result.success) {
      setResultadoDespublicar(`Despublicado: ${result.data.aparelhos} aparelho(s), ${result.data.produtos} produto(s), ${result.data.lacrados} variante(s) de lacrado.`);
    }
  }

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const item of itens) contagem.set(item.categoria, (contagem.get(item.categoria) ?? 0) + 1);
    return Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]); // mais itens primeiro
  }, [itens]);

  const [abaAtiva, setAbaAtiva] = useState("todas");

  const itensFiltrados = abaAtiva === "todas" ? itens : itens.filter((i) => i.categoria === abaAtiva);

  if (itens.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nada publicado na loja virtual ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {resultadoDespublicar ? (
          <p className="text-xs text-success">{resultadoDespublicar}</p>
        ) : confirmandoDespublicar ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-danger">Despublicar TUDO da loja virtual? (item cadastrado em Estoque Física não é afetado)</span>
            <button type="button" onClick={handleDespublicarTudo} disabled={despublicando} className="rounded bg-danger px-2 py-1 font-medium text-white hover:opacity-90">
              {despublicando ? "Despublicando..." : "Confirmar"}
            </button>
            <button type="button" onClick={() => setConfirmandoDespublicar(false)} className="text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmandoDespublicar(true)} className="text-xs font-medium text-danger hover:underline">
            Despublicar tudo da loja virtual
          </button>
        )}
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="todas">Todas ({itens.length})</TabsTrigger>
        {categorias.map(([categoria, total]) => (
          <TabsTrigger key={categoria} value={categoria}>{labelCategoriaAdmin(categoria)} ({total})</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={abaAtiva}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Detalhe</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensFiltrados.map((item, i) => {
              const tipo = LABEL_TIPO[item.tipo];
              return (
                <TableRow key={i} className="cursor-pointer hover:bg-secondary/50" onClick={() => router.push(item.hrefAdmin)}>
                  <TableCell><Badge className={tipo.cor}><tipo.icon className="h-3 w-3" />{tipo.label}</Badge></TableCell>
                  <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                  <TableCell>
                    {item.produtoId ? (
                      <EditorCategoriaInline produtoId={item.produtoId} categoriaAtual={item.categoria} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{labelCategoriaAdmin(item.categoria)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.detalhe}</TableCell>
                  <TableCell>{item.preco ? formatCurrency(item.preco) : "—"}</TableCell>
                  <TableCell>
                    {item.href !== "#" && (
                      <Link href={item.href} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-primary hover:underline">Ver na loja →</Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
    </div>
  );
}
