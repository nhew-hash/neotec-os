import type { Fornecedor, TipoLista } from "./classificador";

export type Condicao = "Lacrado" | "Seminovo";

export interface ItemExtraido {
  categoriaSlug: string;
  marca: string;
  modeloCanonico: string;
  modeloReconhecido: boolean;
  condicao: Condicao | null;
  armazenamentoGb: number | null;
  ramGb: number | null;
  ramPossivelTypo: boolean;
  conectividade: "4G" | "5G" | null;
  nfc: boolean;
  tamanhoMm: number | null;
  gpsCellular: "GPS" | "GPS+Cellular" | null;
  cor: string;
  corBase: string;
  corEmojiOrigem: string | null;
  bateriaPct: number | null;
  cidade: string | null;
  garantia: string | null;
  quantidade: number;
  tags: string[];
  fornecedor: Fornecedor;
  tipoLista: TipoLista;
  precoFornecedor: number;
  linhaOrigem: string;
}

export type MotivoDescarte =
  | "iphone_lacrado_goat"
  | "bateria_baixa"
  | "bateria_nao_informada"
  | "cpo"
  | "comentario"
  | "ambiguo"
  | "preco_invalido"
  | "emoji_cor_desconhecido";

export interface ItemDescartado {
  linhaOrigem: string;
  descricao: string;
  motivo: MotivoDescarte;
  detalhe?: string;
}

export interface ResultadoParser {
  itens: ItemExtraido[];
  descartados: ItemDescartado[];
}
