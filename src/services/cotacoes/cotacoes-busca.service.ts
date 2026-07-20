import { createClient } from "@/lib/supabase/server";
import type { CotacaoItem, Cotacao } from "@/types";

export interface ItemComCotacao extends CotacaoItem {
  cotacao: Pick<Cotacao, "id" | "fornecedor" | "data_cotacao" | "categoria" | "status">;
}

interface FiltrosBusca {
  termosModelo: string[];
  cor?: string;
  bateriaMin?: number;
  precoMax?: number;
  precoMin?: number;
  armazenamento?: string;
}

const CORES_CONHECIDAS = [
  "preto", "branco", "roxo", "dourado", "verde", "azul", "titânio", "titanio",
  "rosa", "amarelo", "vermelho", "cinza", "grafite", "prata",
];

/**
 * Interpreta a busca digitada — deliberadamente NÃO usa IA aqui.
 * "pesquisa extremamente rápida" pede resposta instantânea, e o padrão
 * de busca (número do modelo + cor/preço/armazenamento opcionais) é
 * simples o suficiente pra um parser determinístico, sem o custo e a
 * latência de uma chamada de IA a cada tecla.
 */
function interpretarBusca(termo: string): FiltrosBusca {
  const partes = termo.toLowerCase().trim().split(/\s+/);
  const filtros: FiltrosBusca = { termosModelo: [] };
  let i = 0;

  while (i < partes.length) {
    const parte = partes[i];

    // "acima de 90%" / "90%" / "acima de 90"
    if (parte === "acima" && partes[i + 1] === "de") {
      const valor = parseInt(partes[i + 2]);
      if (!Number.isNaN(valor)) filtros.bateriaMin = valor;
      i += 3;
      continue;
    }
    const matchBateria = parte.match(/^(\d+)%$/);
    if (matchBateria) {
      filtros.bateriaMin = Number(matchBateria[1]);
      i += 1;
      continue;
    }

    // "até 4000" / "ate 4000"
    if ((parte === "até" || parte === "ate") && partes[i + 1]) {
      const valor = parseInt(partes[i + 1].replace(/\D/g, ""));
      if (!Number.isNaN(valor)) filtros.precoMax = valor;
      i += 2;
      continue;
    }

    // Armazenamento: "256", "128g", "256gb" — número de 2-4 dígitos que bate com valores comuns de armazenamento
    const matchArmazenamento = parte.match(/^(\d{2,4})g?b?$/);
    if (matchArmazenamento && ["64", "128", "256", "512", "1024", "1tb"].includes(matchArmazenamento[1])) {
      filtros.armazenamento = matchArmazenamento[1];
      i += 1;
      continue;
    }

    // Cor conhecida
    const corEncontrada = CORES_CONHECIDAS.find((c) => parte.includes(c) || c.includes(parte));
    if (corEncontrada) {
      filtros.cor = corEncontrada;
      i += 1;
      continue;
    }

    // Sobrou — é parte do nome do modelo ("15", "pro", "max"...)
    filtros.termosModelo.push(parte);
    i += 1;
  }

  return filtros;
}

export async function buscarItensCotacao(termo: string, apenasAtivas: boolean = true): Promise<ItemComCotacao[]> {
  const filtros = interpretarBusca(termo);
  const supabase = await createClient();

  let query = supabase
    .from("cotacao_itens")
    .select("*, cotacao:cotacoes!inner(id, fornecedor, data_cotacao, categoria, status)")
    .order("preco", { ascending: true });

  if (apenasAtivas) query = query.eq("cotacao.status", "ativa");

  filtros.termosModelo.forEach((termoModelo) => {
    query = query.ilike("modelo", `%${termoModelo}%`);
  });
  if (filtros.cor) query = query.ilike("cor", `%${filtros.cor}%`);
  if (filtros.bateriaMin != null) query = query.gte("bateria_percentual", filtros.bateriaMin);
  if (filtros.precoMax != null) query = query.lte("preco", filtros.precoMax);
  if (filtros.precoMin != null) query = query.gte("preco", filtros.precoMin);
  if (filtros.armazenamento) query = query.ilike("armazenamento", `%${filtros.armazenamento}%`);

  const { data, error } = await query.limit(100);
  if (error) throw new Error(`Não foi possível buscar: ${error.message}`);
  return (data ?? []) as unknown as ItemComCotacao[];
}
