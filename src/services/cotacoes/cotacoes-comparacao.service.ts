import { buscarCotacaoPorId } from "./cotacoes.service";
import type { CotacaoItem } from "@/types";

export interface ItemComparado {
  modelo: string;
  armazenamento: string | null;
  cor: string | null;
  precoA: number | null;
  precoB: number | null;
  diferenca: number | null;
  percentual: number | null;
  situacao: "subiu" | "caiu" | "igual" | "so_em_a" | "so_em_b";
}

function chaveItem(item: Pick<CotacaoItem, "modelo" | "armazenamento" | "cor">): string {
  return `${item.modelo.toLowerCase()}|${(item.armazenamento ?? "").toLowerCase()}|${(item.cor ?? "").toLowerCase()}`;
}

export async function compararCotacoes(idA: string, idB: string) {
  const [cotacaoA, cotacaoB] = await Promise.all([buscarCotacaoPorId(idA), buscarCotacaoPorId(idB)]);
  if (!cotacaoA || !cotacaoB) throw new Error("Uma das cotações não foi encontrada");

  const mapaB = new Map(cotacaoB.itens.map((item) => [chaveItem(item), item]));
  const chavesVistas = new Set<string>();
  const comparacao: ItemComparado[] = [];

  for (const itemA of cotacaoA.itens) {
    const chave = chaveItem(itemA);
    chavesVistas.add(chave);
    const itemB = mapaB.get(chave);

    if (!itemB) {
      comparacao.push({
        modelo: itemA.modelo, armazenamento: itemA.armazenamento, cor: itemA.cor,
        precoA: itemA.preco, precoB: null, diferenca: null, percentual: null, situacao: "so_em_a",
      });
      continue;
    }

    const diferenca = itemB.preco - itemA.preco;
    comparacao.push({
      modelo: itemA.modelo, armazenamento: itemA.armazenamento, cor: itemA.cor,
      precoA: itemA.preco, precoB: itemB.preco, diferenca,
      percentual: itemA.preco > 0 ? (diferenca / itemA.preco) * 100 : null,
      situacao: diferenca > 0 ? "subiu" : diferenca < 0 ? "caiu" : "igual",
    });
  }

  for (const itemB of cotacaoB.itens) {
    const chave = chaveItem(itemB);
    if (chavesVistas.has(chave)) continue;
    comparacao.push({
      modelo: itemB.modelo, armazenamento: itemB.armazenamento, cor: itemB.cor,
      precoA: null, precoB: itemB.preco, diferenca: null, percentual: null, situacao: "so_em_b",
    });
  }

  return { cotacaoA, cotacaoB, comparacao };
}
