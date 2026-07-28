import { z } from "zod";
import { executarPromptIA } from "@/services/ia/ia.service";

export type DestinoItemFornecedor = "seminovo" | "lacrado" | "generico";

const itemSchema = z.object({
  destino: z.enum(["seminovo", "lacrado", "generico"]),
  modelo: z.string(),
  categoria: z.string().trim().min(1).default("acessorio"),
  marca: z.string().nullable().default(null),
  memoria: z.string().nullable().default(null),
  cor: z.string().nullable().default(null),
  bateria: z.coerce.number().nullable().default(null),
  observacoes: z.string().nullable().default(null),
  preco: z.coerce.number(),
  linhaOriginal: z.string(),
});

export type ItemFornecedorExtraido = z.infer<typeof itemSchema>;

const PROMPT_SISTEMA = `Você é a Central de Cadastro por Fornecedor da Neotec — recebe listas de preço bagunçadas (WhatsApp de fornecedor, com emoji, abreviação, tudo misturado) e classifica CADA item pro destino certo.

REGRA DE CLASSIFICAÇÃO (a mais importante):
- "seminovo": tem SAÚDE DE BATERIA (%) no texto. Ex: "17 256G 100%💜4499" → seminovo, bateria 100.
- "lacrado": aparelho novo/lacrado — NUNCA tem % de bateria. Ex: "17 pro max 512g⚪️8599" → lacrado.
  **Toda lista de Android (Samsung, Xiaomi, Redmi, Poco, Realme, Motorola, Honor, Infinix/Spark...) SEM % de bateria é SEMPRE lacrado** — esse é o formato padrão de lista de fornecedor de Android, nunca precisa de mais confirmação além da ausência de %.
  **TESTE OBRIGATÓRIO antes de marcar "seminovo": a linha tem um número seguido de "%" em algum lugar? Se NÃO tiver, é IMPOSSÍVEL ser "seminovo" — tem que ser "lacrado", mesmo que o modelo/contexto pareça sugerir seminovo. Não classifique por intuição ou pelo que veio antes na lista — só o "%" decide.**
  **Tablet Android (Samsung Tab, Xiaomi Pad) também é "lacrado" quando sem % de bateria** — tem cor/armazenamento como variante, igual celular, por isso segue o mesmo caminho de catálogo (não é "generico"). iPad continua "generico" — segue seu próprio catálogo separado.
- "generico": produto de item único, sem variante de cor/armazenamento fazendo sentido pra ele — MacBook, Apple Watch, acessório (cabo/fonte/capinha), caixa de som (JBL/Bose), videogame (PS5/Xbox), brinquedo, qualquer outro produto/marca. Nunca tenta forçar isso em seminovo ou lacrado.

REGRA DE ITENS MÚLTIPLOS NA MESMA LINHA:
Quando uma linha de seminovo tiver VÁRIOS pares de bateria+cor antes do preço,
isso significa VÁRIAS UNIDADES diferentes desse mesmo modelo/memória, cada
uma com sua bateria/cor — todas ao mesmo preço mostrado no final da linha.
Devolva um item separado pra cada par bateria+cor, repetindo o mesmo preço.
O padrão de bateria+cor varia — a cor pode vir ANTES ou DEPOIS de cada %,
e nem sempre segue exatamente a mesma ordem dentro da mesma linha. Exemplos:
- "16 PRO MAX 256G 90%⚫️90%🩶92%💛5149" → 3 itens (256G, 90% preto / 90% titânio / 92% amarelo, todos 5149)
- "15 PRO MAX 256G🩶92% 85%⚫️ 4099" → 2 itens (256G, 92% titânio / 85% preto, todos 4099) — repare que aqui a cor do primeiro item vem ANTES do %, e o segundo vem DEPOIS
- "13 128G 💚 83% 88% 84% 90%⚫️1699 ⚪️ 86% 1749" → aqui os preços SÃO diferentes por cor (1699 pro grupo preto/verde, 1749 pro branco) — quando isso acontecer, associe cada bateria ao preço mais próximo dela no texto, não assuma sempre o mesmo preço pra tudo.

REGRA DE "NFC", EDIÇÃO ESPECIAL, E SPECS DE RAM (importante — evita erro de formato):
- "NFC" NUNCA vira campo separado nem item novo — é só texto dentro de "observacoes" (ex: "com NFC"). O item continua sendo UM SÓ, igual seria sem o NFC.
- Edição especial (ex: "Homem de Ferro", "Iron Man", qualquer nome de edição limitada) NUNCA vira "cor" nem item novo — é texto em "observacoes" (ex: "Edição Homem de Ferro").
- "256/8", "512/12" etc = armazenamento/RAM — SEMPRE um item só, "memoria" recebe só o armazenamento ("256GB"), o RAM (o número depois da barra) vira texto em "observacoes" se quiser guardar (ex: "8GB RAM"), nunca cria item ou campo novo por causa disso.
- "5G", "108mp", "48mp" (specs de câmera) — mesma coisa, tudo vira texto em "observacoes", nunca item novo nem campo novo.
- Regra geral: se não é "modelo", "categoria", "marca", "memoria", "cor", "bateria" ou "preco", é OBSERVAÇÃO — nunca invente um campo novo no JSON que não esteja no formato pedido, isso quebra a leitura do resultado.

REGRA DE EMOJI DE COR (comum em fornecedor):
⚫️/🖤 = Preto, ⚪️ = Branco, 🔵 = Azul, 🟣/💜 = Roxo, 🟡/💛 = Amarelo,
🟢/💚 = Verde, 🩶 = Titânio/Cinza, 🧡 = Laranja.

Responda APENAS com um objeto JSON no formato {"itens": [...]}, assim:
{"itens": [{"destino": "seminovo", "modelo": "iPhone 17", "categoria": "iphone", "marca": null, "memoria": "256GB", "cor": "Roxo", "bateria": 100, "observacoes": null, "preco": 4499, "linhaOriginal": "17 256G 100%💜4499"}]}

Regras gerais:
- "modelo" sempre completo: "iPhone 17 Pro Max", "iPad", "MacBook Air", "Apple Watch Series 11", "JBL Go 4", "PS5" — o que fizer sentido pro item.
- "categoria" — texto livre, minúsculo, sem espaço (use "_" se precisar). NUNCA fica travado numa lista fixa — categorias conhecidas e seus critérios:
  - "iphone": qualquer iPhone.
  - "android": qualquer celular Android.
  - "apple_watch": qualquer Apple Watch.
  - "ipad": qualquer iPad.
  - "mac": qualquer MacBook, iMac, Mac Mini, Mac Studio.
  - "tablet": tablet que NÃO é iPad (Samsung Tab, Xiaomi Pad, etc).
  - "acessorio": cabo, fonte, capinha, película, fone, power bank, suporte — SÓ pra marca Apple original. Marca não-Apple usa a categoria da marca (ver abaixo).
  Quando o item não se encaixa em nenhuma dessas, **crie uma categoria nova que faça sentido** — minúscula, sem espaço, baseada no tipo de produto ou na marca. Exemplos de categoria nova que você deve criar sozinho quando aparecer:
  - Caixa de som JBL/Bose/etc → categoria "jbl" (ou o nome da marca em minúsculo).
  - Videogame/console (PS5, Xbox, Switch) → categoria "videogame".
  - Brinquedo, triciclo, patinete elétrico, drone → categoria "brinquedo" (ou mais específico se fizer mais sentido, tipo "mobilidade").
  Nunca force um item numa categoria que não combina só pra evitar criar uma nova — criar categoria nova é o comportamento CORRETO e esperado, não uma exceção.
  Nunca classifique um item pela categoria do item anterior/seguinte na lista — cada linha tem sua própria categoria, independente do contexto ao redor.
- "marca": preenche sempre que identificável (Apple, Samsung, Xiaomi, JBL, Sony...) — mesmo em categoria nova criada por você.
- "observacoes": guarda detalhe extra relevante — "com caixa", "detalhes de uso", "tampa traseira trocada", tamanho de tela (40mm/42mm/46mm), specs (256/8), "5G", "NFC", "PROMOÇÃO", edição especial (ex: "Homem de Ferro"), etc.
- "linhaOriginal": copia a linha (ou trecho) de origem, ajuda a equipe conferir depois.
- Nunca invente preço — se não tiver preço claro na linha, pule o item.
- Ignore linhas de cabeçalho/decoração (títulos de seção, "🔥🔥🔥", asteriscos de negrito, etc.) — elas não são item, só ajudam a entender o contexto das linhas seguintes.`;

function normalizarResposta(bruto: unknown): unknown[] {
  if (Array.isArray(bruto)) return bruto;
  if (bruto && typeof bruto === "object" && Array.isArray((bruto as { itens?: unknown }).itens)) {
    return (bruto as { itens: unknown[] }).itens;
  }
  throw new Error("A IA devolveu um formato que não reconheço — tenta de novo ou reformula o texto.");
}

function memoriaEmGB(memoria: string | null): number | null {
  if (!memoria) return null;
  const match = memoria.match(/([\d.,]+)\s*(GB|TB|G|T)/i);
  if (!match) return null;
  const valor = parseFloat(match[1].replace(",", "."));
  const unidade = match[2].toUpperCase();
  return unidade.startsWith("T") ? valor * 1024 : valor;
}

/** Nunca aplica nada sozinho — só classifica e extrai, pra revisão humana antes de qualquer cadastro/atualização real. */
export async function classificarItensFornecedor(texto: string): Promise<ItemFornecedorExtraido[]> {
  const resultado = await executarPromptIA({
    modulo: "central_fornecedor_ia",
    prompt: texto,
    sistema: PROMPT_SISTEMA,
    temperatura: 0.1,
    formatoJson: true,
    // Listas com muitas categorias diferentes (Android + tablet + Apple
    // Watch + acessório + JBL + videogame etc misturados) precisam de
    // ainda mais espaço que uma lista só de Android — 12000 já cortou
    // uma vez, foi pra 16000.
    maxTokens: 16000,
  });

  let bruto: unknown;
  try {
    bruto = JSON.parse(resultado.texto);
  } catch {
    throw new Error("A resposta da IA veio incompleta ou cortada — tenta colar a lista em 2-3 partes menores, ou tenta de novo.");
  }

  const itensBrutos = normalizarResposta(bruto);

  // Valida item por item — antes, UM item mal formatado derrubava a
  // lista inteira. Agora só descarta o item ruim, o resto passa
  // normal (equipe consegue ver o que faltou e adicionar na mão).
  const itensValidos: z.infer<typeof itemSchema>[] = [];
  let itensDescartados = 0;
  for (const itemBruto of itensBrutos) {
    const resultado = itemSchema.safeParse(itemBruto);
    if (resultado.success) {
      itensValidos.push(resultado.data);
    } else {
      itensDescartados++;
      console.error("Item descartado por formato inválido:", JSON.stringify(itemBruto).slice(0, 200), resultado.error.issues.slice(0, 3));
    }
  }

  if (itensValidos.length === 0) {
    throw new Error("A IA devolveu dados em formato inesperado — se a lista for muito grande, tenta colar em partes menores (ex: 15 itens de cada vez).");
  }
  if (itensDescartados > 0) {
    console.error(`Central de Cadastro: ${itensDescartados} item(ns) descartado(s) por formato inválido, ${itensValidos.length} processado(s) normalmente.`);
  }

  // Item com memória abaixo de 1GB quase certamente é erro de leitura
  // (emoji/número confundido com capacidade) — nunca aplica, nem
  // mostra pra revisão, já descarta aqui.
  const itensFiltrados = itensValidos.filter((item) => {
    const gb = memoriaEmGB(item.memoria);
    return gb === null || gb >= 1;
  });

  // Trava determinística — não depende só do prompt acertar.
  return itensFiltrados.map((item) => {
    const temPercentual = /(\d+)\s*%/.test(item.linhaOriginal);

    // Caso 1: marcou "seminovo" mas não tem % nenhum na linha —
    // impossível ser seminovo sem saúde de bateria informada, corrige pra "lacrado".
    if (item.destino === "seminovo" && !temPercentual) {
      return { ...item, destino: "lacrado" as const, bateria: null };
    }

    // Caso 2 (o oposto): a linha TEM % mas a IA classificou como
    // outra coisa (lacrado/generico) — % é sinal forte demais de
    // seminovo pra ignorar. Corrige e extrai a bateria do texto,
    // já que nesse caso o campo bateria pode ter ficado vazio.
    if (item.destino !== "seminovo" && temPercentual) {
      const match = item.linhaOriginal.match(/(\d+)\s*%/);
      const bateriaExtraida = item.bateria ?? (match ? Number(match[1]) : null);
      return { ...item, destino: "seminovo" as const, bateria: bateriaExtraida };
    }

    return item;
  });
}
