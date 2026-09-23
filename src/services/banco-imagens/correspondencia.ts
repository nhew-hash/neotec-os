/**
 * Lógica de correspondência entre um item do estoque (produto, aparelho
 * ou variante lacrada) e um grupo do Banco Central de Imagens —
 * FUNÇÕES PURAS, sem acesso a banco, pra poder testar isolado e ser o
 * único lugar onde essa regra existe (antes estava duplicada, com
 * pequenas diferenças, em `banco-imagens.service.ts` e
 * `banco-imagens-ia.service.ts`).
 *
 * Regras que não podem mudar (Fase 247):
 * - Vínculo é sempre EXATO por modelo ("iPhone 14" != "iPhone 14 Pro
 *   Max") — nunca "contém"/substring.
 * - Na dúvida (cor composta do estoque batendo com 0 ou 2+ grupos),
 *   NÃO vincula — reporta como ambíguo pra escolha manual. É sempre
 *   preferível não mostrar foto a mostrar a foto errada.
 * - A cor OFICIAL do grupo nunca é "traduzida"/colapsada aqui — isso é
 *   papel de `cores_equivalentes`, preenchido à parte.
 */

export interface GrupoParaCorrespondencia {
  id: string;
  marca: string;
  modelo: string;
  cor: string | null;
  modelosEquivalentes?: string[];
  coresEquivalentes?: string[];
}

export interface ItemParaCorrespondencia {
  marca: string | null;
  modelo: string;
  cor: string | null;
}

export type ResultadoCorrespondencia =
  | { status: "vinculado"; grupoId: string }
  | { status: "ambiguo"; candidatos: string[] }
  | { status: "sem_match" };

const MARCAS_EQUIVALENTES: Record<string, string> = {
  redmi: "xiaomi",
  poco: "xiaomi",
};

/** Sem acento, minúsculo, trim, espaços/hífens/underscores unificados — "Titânio-preto" e "titanio  preto" viram a mesma string. */
export function normalizar(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Compara marca com normalização e trata Xiaomi como equivalente de Redmi/POCO (sub-marcas vendidas como se fossem a própria Xiaomi no estoque). Item sem marca informada não bloqueia o match (produtos sem marca cadastrada). */
export function marcaBate(marcaItem: string | null, marcaGrupo: string): boolean {
  if (!marcaItem) return true;
  const a = normalizar(marcaItem);
  const b = normalizar(marcaGrupo);
  const canonA = MARCAS_EQUIVALENTES[a] ?? a;
  const canonB = MARCAS_EQUIVALENTES[b] ?? b;
  return canonA === canonB;
}

/** Match EXATO de modelo — nome do produto igual ao modelo do grupo OU a algum modelo_equivalente. Nunca "contém". */
export function modeloBate(nomeProduto: string, grupo: GrupoParaCorrespondencia): boolean {
  const nome = normalizar(nomeProduto);
  if (!nome) return false;
  if (nome === normalizar(grupo.modelo)) return true;
  return (grupo.modelosEquivalentes ?? []).some((m) => normalizar(m) === nome);
}

/** Match de uma cor simples (já sem "/") contra a cor oficial do grupo ou suas equivalentes. */
export function corBate(corEstoque: string, grupo: GrupoParaCorrespondencia): boolean {
  const cor = normalizar(corEstoque);
  if (!cor) return false;
  if (grupo.cor && normalizar(grupo.cor) === cor) return true;
  return (grupo.coresEquivalentes ?? []).some((c) => normalizar(c) === cor);
}

interface ResultadoCorComposta {
  status: "vinculado" | "ambiguo" | "sem_match";
  grupo?: GrupoParaCorrespondencia;
  candidatos?: GrupoParaCorrespondencia[];
}

/**
 * Cor composta do estoque (ex: "Branco/Prata", "Cinza/Prata/Natural") —
 * quebra por "/", testa cada parte contra os grupos DO MESMO MODELO
 * (já filtrados antes de chamar isso). Se exatamente 1 grupo casar em
 * qualquer uma das partes → vincula nele. Se 0 ou 2+ grupos distintos
 * casarem → ambíguo (nunca escolhe "no chute").
 */
function resolverCorComposta(corEstoque: string, gruposDoModelo: GrupoParaCorrespondencia[]): ResultadoCorComposta {
  const partes = corEstoque.split("/").map((p) => p.trim()).filter(Boolean);
  const candidatosPorId = new Map<string, GrupoParaCorrespondencia>();
  for (const parte of partes) {
    for (const g of gruposDoModelo) {
      if (corBate(parte, g)) candidatosPorId.set(g.id, g);
    }
  }
  const lista = [...candidatosPorId.values()];
  if (lista.length === 1) return { status: "vinculado", grupo: lista[0] };
  if (lista.length === 0) return { status: "sem_match" };
  return { status: "ambiguo", candidatos: lista };
}

/**
 * Tradução de cores oficiais (Apple e afins) para o nome simplificado
 * usado historicamente no estoque/Central de Cadastro. Antes da Fase
 * 247 essa tradução COLAPSAVA a identidade do grupo (Estelar virava
 * "Branco" e os 4 titânios do 15 Pro viravam um grupo só). A partir de
 * agora ela só serve pra SEMEAR `cores_equivalentes` de um grupo novo
 * — a cor oficial (ex: "Estelar", "Titânio Natural") continua sendo a
 * identidade real do grupo.
 */
const EQUIVALENTES_COR_PADRAO: Record<string, string[]> = {
  estelar: ["Branco"],
  starlight: ["Branco"],
  prateado: ["Branco"],
  silver: ["Branco"],
  "meia noite": ["Preto"],
  midnight: ["Preto"],
  grafite: ["Preto"],
  graphite: ["Preto"],
};

/** Equivalentes padrão pra uma cor oficial — usado só ao CRIAR um grupo novo, pra que estoque com o nome antigo/simplificado continue casando via cores_equivalentes. */
export function equivalentesPadraoParaCor(corOficial: string | null): string[] {
  if (!corOficial) return [];
  const chave = normalizar(corOficial);
  if (EQUIVALENTES_COR_PADRAO[chave]) return EQUIVALENTES_COR_PADRAO[chave];
  // "Titânio X" (Natural/Preto/Azul/Branco/...) — nome genérico "Titânio" usado antes de existir vínculo por cor oficial.
  if (chave === "titanio" || chave.startsWith("titanio ")) return ["Titânio"];
  return [];
}

/**
 * Função principal — dado um item do estoque e a lista de TODOS os
 * grupos do banco de imagens, decide a qual grupo (se algum) ele deve
 * ser vinculado. Não faz nenhuma leitura/escrita de banco — quem chama
 * (revincularTudo, importação em lote) já carregou tudo em memória.
 */
export function resolverGrupo(item: ItemParaCorrespondencia, grupos: GrupoParaCorrespondencia[]): ResultadoCorrespondencia {
  const gruposDoModelo = grupos.filter((g) => modeloBate(item.modelo, g) && marcaBate(item.marca, g.marca));
  if (gruposDoModelo.length === 0) return { status: "sem_match" };

  // Grupo sem cor (perfume, acessório genérico) — vincula só por
  // modelo, sem exigir/considerar cor nenhuma dos dois lados.
  const semCor = gruposDoModelo.filter((g) => !g.cor);
  const comCor = gruposDoModelo.filter((g) => g.cor);

  if (!item.cor) {
    if (semCor.length === 1) return { status: "vinculado", grupoId: semCor[0].id };
    if (semCor.length > 1) return { status: "ambiguo", candidatos: semCor.map((g) => g.id) };
    return { status: "sem_match" };
  }

  if (comCor.length === 0) {
    // Item tem cor mas só existe(m) grupo(s) sem cor pro modelo — não
    // força vínculo (evitaria mostrar foto sem checar a cor de fato).
    return { status: "sem_match" };
  }

  // Cor simples — match direto contra cor oficial ou equivalente.
  const diretos = comCor.filter((g) => corBate(item.cor!, g));
  if (diretos.length === 1) return { status: "vinculado", grupoId: diretos[0].id };
  if (diretos.length > 1) return { status: "ambiguo", candidatos: diretos.map((g) => g.id) };

  // Cor composta ("Branco/Prata", "Cinza/Prata/Natural") — só tenta se
  // a cor do estoque de fato tiver "/"; senão já teria batido acima.
  if (item.cor.includes("/")) {
    const resultado = resolverCorComposta(item.cor, comCor);
    if (resultado.status === "vinculado") return { status: "vinculado", grupoId: resultado.grupo!.id };
    if (resultado.status === "ambiguo") return { status: "ambiguo", candidatos: resultado.candidatos!.map((g) => g.id) };
  }

  return { status: "sem_match" };
}
