import { normalizarParaComparacao } from "./normalizacao";

/**
 * Catálogo de modelos canônicos + aliases (espelha o seed de
 * `import_modelos_catalogo`). Cada entrada mapeia uma forma "como o
 * fornecedor escreve" (normalizada) pro nome oficial padronizado.
 *
 * Mantido em código (além do banco) para os parsers determinísticos
 * rodarem sem round-trip de banco durante os testes de fixture.
 */
interface ModeloCatalogoEntry {
  canonico: string;
  aliases: string[];
  marca: string;
  categoriaSlug: string;
}

export const MODELOS_CATALOGO: ModeloCatalogoEntry[] = [
  // ---- iPhone ----
  { canonico: "iPhone 17e", aliases: ["iphone 17-e", "iphone 17 e"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 17", aliases: ["iphone-17", "iphone 17"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 17 Pro", aliases: ["iphone-17 pro", "iphone 17 pro"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 17 Pro Max", aliases: ["iphone-17 pro max", "iphone 17 pro max", "iphone 17 promax"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 18 Pro Max", aliases: ["iphone-18 pro max", "iphone 18 pro max"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 16 Plus", aliases: ["iphone-16 plus", "iphone 16 plus"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 14 Plus", aliases: ["iphone-14 plus", "iphone 14 plus"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 16", aliases: ["iphone-16", "iphone 16"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 16 Pro", aliases: ["iphone-16 pro", "iphone 16 pro"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 16 Pro Max", aliases: ["iphone-16 pro max", "iphone 16 pro max"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 15", aliases: ["iphone-15", "iphone 15"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 15 Pro", aliases: ["iphone-15 pro", "iphone 15 pro"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 15 Pro Max", aliases: ["iphone-15 pro max", "iphone 15 pro max"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 14 Pro Max", aliases: ["iphone-14 pro max", "iphone 14 pro max"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 14", aliases: ["iphone-14", "iphone 14"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 13 Pro Max", aliases: ["iphone-13 pro max", "iphone 13 pro max"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 13", aliases: ["iphone-13", "iphone 13"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  { canonico: "iPhone 11 Pro Max", aliases: ["iphone-11 pro max", "iphone 11 pro max"], marca: "Apple", categoriaSlug: "smartphones_iphone" },
  // ---- iPad / Pencil ----
  { canonico: "iPad 11", aliases: ["ipad-11", "ipad 11", "ipad geracao 11", "ipad 11 geracao"], marca: "Apple", categoriaSlug: "tablets_ipad" },
  { canonico: "Apple Pencil", aliases: ["apple pencil", "pencil"], marca: "Apple", categoriaSlug: "acessorios_apple" },
  // ---- MacBook ----
  { canonico: "MacBook Neo", aliases: ["macbook neo"], marca: "Apple", categoriaSlug: "computadores_macbook" },
  // ---- Apple Watch ----
  { canonico: "Apple Watch Series 10", aliases: ["apple wacht s10", "apple watch s10", "apple watch series 10", "apple watch s-10"], marca: "Apple", categoriaSlug: "smartwatches_apple_watch" },
  { canonico: "Apple Watch Series 11", aliases: ["apple watch s11", "apple watch series 11", "apple watch s-11"], marca: "Apple", categoriaSlug: "smartwatches_apple_watch" },
  { canonico: "Apple Watch SE", aliases: ["apple watch se"], marca: "Apple", categoriaSlug: "smartwatches_apple_watch" },
  { canonico: "Apple Watch Ultra 2", aliases: ["apple watch ultra 2", "apple watch ultra2"], marca: "Apple", categoriaSlug: "smartwatches_apple_watch" },
  // ---- Samsung ----
  { canonico: "Galaxy S25 Ultra", aliases: ["galaxy s25 ultra", "s25 ultra"], marca: "Samsung", categoriaSlug: "smartphones_samsung" },
  { canonico: "Galaxy S25", aliases: ["galaxy s25", "s25"], marca: "Samsung", categoriaSlug: "smartphones_samsung" },
  { canonico: "Galaxy A56", aliases: ["galaxy a56", "a56"], marca: "Samsung", categoriaSlug: "smartphones_samsung" },
  // ---- Xiaomi / Redmi / Poco ----
  { canonico: "Redmi Note 15 Pro 5G", aliases: ["note15 pro 256g 5g", "note 15 pro 5g", "redmi note 15 pro 5g", "redmi note 15 pro"], marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi" },
  { canonico: "Redmi Note 14", aliases: ["redmi note 14", "note 14", "note14"], marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi" },
  { canonico: "Poco X8 Pro Max", aliases: ["poco x8 promax", "poco x8 pro max"], marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi" },
  { canonico: "Poco X7", aliases: ["poco x7"], marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi" },
  { canonico: "Redmi 14C", aliases: ["redmi 14c"], marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi" },
  // ---- Outras marcas ----
  { canonico: "Tecno Spark Go 1", aliases: ["spark go1", "tecno spark go 1", "spark go 1"], marca: "Tecno", categoriaSlug: "smartphones_outras_marcas" },
  { canonico: "Itel A60", aliases: ["itel a60"], marca: "Itel", categoriaSlug: "smartphones_outras_marcas" },
  // ---- Tablets ----
  { canonico: "Tablet Infantil 64/4", aliases: ["tablet infantil 64/4", "tablet infantil"], marca: "Genérica", categoriaSlug: "tablets_infantil" },
  // ---- Áudio ----
  { canonico: "JBL Boombox 4", aliases: ["boombox 4", "jbl boombox 4"], marca: "JBL", categoriaSlug: "audio_caixas_de_som" },
  { canonico: "JBL Flip 6", aliases: ["jbl flip 6", "flip 6"], marca: "JBL", categoriaSlug: "audio_caixas_de_som" },
];

export interface ResultadoResolucaoModelo {
  canonico: string;
  marca: string;
  categoriaSlug: string;
  reconhecido: boolean;
}

/**
 * Tenta resolver um trecho de texto (linha de modelo) para o modelo
 * canônico do catálogo. Faz correspondência por substring normalizada
 * (contains), então não depende de o fornecedor escrever exatamente
 * igual ao alias. Se nada bater, retorna o texto original como
 * "canonico" mas com `reconhecido: false` (o item ainda entra, mas fica
 * flagado para revisão, conforme a spec).
 */
export function resolverModeloCanonico(textoLinha: string): ResultadoResolucaoModelo {
  const normalizado = normalizarParaComparacao(textoLinha);

  // Ordena por tamanho de alias decrescente para preferir o match mais específico
  // (ex: "iphone 17 pro max" deve vencer sobre "iphone 17 pro").
  const candidatos = [...MODELOS_CATALOGO].sort((a, b) => {
    const maiorA = Math.max(...a.aliases.map((al) => al.length));
    const maiorB = Math.max(...b.aliases.map((al) => al.length));
    return maiorB - maiorA;
  });

  for (const entrada of candidatos) {
    for (const alias of entrada.aliases) {
      if (normalizado.includes(alias)) {
        return {
          canonico: entrada.canonico,
          marca: entrada.marca,
          categoriaSlug: entrada.categoriaSlug,
          reconhecido: true,
        };
      }
    }
  }

  const porFamilia = resolverPorFamilia(normalizado, textoLinha);
  if (porFamilia) return porFamilia;

  return {
    canonico: textoLinha.trim(),
    marca: "Desconhecida",
    categoriaSlug: "nao-classificado",
    reconhecido: false,
  };
}

function capitalizarPalavra(p: string): string {
  return p.length > 0 ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p;
}

/**
 * Regras de família aplicadas quando nenhum alias exato do catálogo bate
 * — cobre variações de escrita (espaço/hífen, maiúsculas) de linhas de
 * modelo que seguem um padrão previsível, sem precisar cadastrar cada
 * variante individualmente. Ex: "Note15 pro 256g 5G" → "Redmi Note 15
 * Pro 5G"; "Poco x8 promax" → "Poco X8 Pro Max".
 */
function resolverPorFamilia(normalizado: string, textoOriginal: string): ResultadoResolucaoModelo | null {
  // Redmi Note / "Note ..." (Realeza escreve só "Note", sem "Redmi")
  let m = normalizado.match(/\bnote\s*(\d+)\s*(pro)?\s*(max)?/);
  if (m) {
    const partes = ["Redmi", "Note", m[1]];
    if (m[2]) partes.push("Pro");
    if (m[3]) partes.push("Max");
    if (/\b5g\b/.test(normalizado)) partes.push("5G");
    return { canonico: partes.join(" "), marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi", reconhecido: true };
  }

  // Poco <código> [pro] [max]
  m = normalizado.match(/\bpoco\s*([a-z]?\d+)\s*(pro\s*)?(max)?/);
  if (m) {
    const partes = ["Poco", m[1].toUpperCase()];
    if (m[2]) partes.push("Pro");
    if (m[3]) partes.push("Max");
    return { canonico: partes.join(" "), marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi", reconhecido: true };
  }

  // Redmi <código> [pro] (mas não "redmi note", já tratado acima)
  m = normalizado.match(/\bredmi\s+(?!note)([a-z]?\d+[a-z]?)\s*(pro)?/);
  if (m) {
    const partes = ["Redmi", m[1].toUpperCase()];
    if (m[2]) partes.push("Pro");
    return { canonico: partes.join(" "), marca: "Xiaomi", categoriaSlug: "smartphones_xiaomi", reconhecido: true };
  }

  // Itel <modelo>
  m = normalizado.match(/\bitel\s*(\d+[a-z]?)/);
  if (m) {
    return { canonico: `Itel ${m[1].toUpperCase()}`, marca: "Itel", categoriaSlug: "smartphones_outras_marcas", reconhecido: true };
  }

  // Samsung Galaxy <resto> / Samsung <modelo> (celular)
  m = normalizado.match(/\bsamsung\s+(?:galaxy\s+)?(?:tab\s*)?([a-z0-9]+)/);
  if (m && /tablet|tab\b/.test(normalizado)) {
    return { canonico: `Samsung Galaxy Tab ${m[1].toUpperCase()}`, marca: "Samsung", categoriaSlug: "tablets_android", reconhecido: true };
  }
  if (m) {
    return { canonico: `Samsung Galaxy ${m[1].toUpperCase()}`, marca: "Samsung", categoriaSlug: "smartphones_samsung", reconhecido: true };
  }

  // Tablets genéricos
  if (/tablet\s+infantil/.test(normalizado)) {
    return { canonico: "Tablet Infantil", marca: "Genérica", categoriaSlug: "tablets_infantil", reconhecido: true };
  }
  if (/\bxiaomi\s+pad\s*(\d*)/.test(normalizado)) {
    const mm = normalizado.match(/\bxiaomi\s+pad\s*(\d*)/);
    return { canonico: `Xiaomi Pad ${mm?.[1] ?? ""}`.trim(), marca: "Xiaomi", categoriaSlug: "tablets_android", reconhecido: true };
  }
  if (/\btablet\b/.test(normalizado)) {
    return { canonico: capitalizarLinha(textoOriginal), marca: "Desconhecida", categoriaSlug: "tablets_android", reconhecido: false };
  }

  // JBL
  m = normalizado.match(/\bjbl\s+(.+)/);
  if (m) {
    const resto = m[1].trim();
    let sub = "audio_caixas_de_som";
    if (/\bfone\b/.test(normalizado)) sub = "audio_fones";
    return { canonico: `JBL ${capitalizarLinha(resto)}`, marca: "JBL", categoriaSlug: sub, reconhecido: true };
  }
  if (/\bfone\b/.test(normalizado)) {
    return { canonico: capitalizarLinha(textoOriginal), marca: "Desconhecida", categoriaSlug: "audio_fones", reconhecido: false };
  }

  // Caixa de som genérica (sem marca reconhecida — JBL já foi tratado acima)
  if (/caixa\s+de\s+som|caixinha\s+de\s+som/.test(normalizado)) {
    return { canonico: capitalizarLinha(textoOriginal), marca: "Desconhecida", categoriaSlug: "audio_caixas_de_som", reconhecido: false };
  }

  // Hollyland / microfone (marca conhecida) ou "microfone" genérico
  if (/hollyland|lark/.test(normalizado)) {
    return { canonico: "Hollyland Lark M2 Combo", marca: "Hollyland", categoriaSlug: "audio_microfones", reconhecido: true };
  }
  if (/microfone|\bmic\b/.test(normalizado)) {
    return { canonico: capitalizarLinha(textoOriginal), marca: "Desconhecida", categoriaSlug: "audio_microfones", reconhecido: false };
  }

  // Notebook (qualquer marca — Apple usa "MacBook", já tratado à parte)
  if (/notebook|note\s*book/.test(normalizado)) {
    const marca = /dell/.test(normalizado)
      ? "Dell"
      : /lenovo/.test(normalizado)
        ? "Lenovo"
        : /acer/.test(normalizado)
          ? "Acer"
          : /hp\b/.test(normalizado)
            ? "HP"
            : /samsung/.test(normalizado)
              ? "Samsung"
              : "Desconhecida";
    return { canonico: capitalizarLinha(textoOriginal), marca, categoriaSlug: "computadores_notebook", reconhecido: marca !== "Desconhecida" };
  }

  // Robô aspirador
  if (/rob[oô]\s+aspirador/.test(normalizado)) {
    const marca = /xiaomi/.test(normalizado) ? "Xiaomi" : "Desconhecida";
    return { canonico: capitalizarLinha(textoOriginal), marca, categoriaSlug: "casa_inteligente_robos_aspiradores", reconhecido: true };
  }

  // Triciclo / patinete elétrico
  if (/triciclo|patinete/.test(normalizado)) {
    return { canonico: capitalizarLinha(textoOriginal), marca: "Desconhecida", categoriaSlug: "mobilidade_triciclos_patinetes", reconhecido: true };
  }

  return null;
}

function capitalizarLinha(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map(capitalizarPalavra)
    .join(" ");
}
