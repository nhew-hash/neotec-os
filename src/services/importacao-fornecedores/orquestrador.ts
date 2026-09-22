import { classificarMensagem, type Fornecedor } from "./classificador";
import { parseGoat } from "./parser-goat";
import { parseRealezaAppleLacrados } from "./parser-realeza-apple";
import { parseRealezaLinhaUnica } from "./parser-realeza-linha-unica";
import { parseRealezaPerfumes } from "./parser-realeza-perfumes";
import { validarItens, type ResultadoValidacao } from "./validacao";
import type { ResultadoParser } from "./tipos";

export interface ResultadoProcessamento {
  classificacao: "lista" | "ignorar" | "tipo_desconhecido";
  tipoLista: ReturnType<typeof classificarMensagem>["tipoLista"];
  resultado: ResultadoValidacao | null;
  motivoIncerteza?: string;
}

/**
 * Ponto único de entrada da extração: classifica a mensagem e, se for
 * lista, roteia pro parser determinístico certo + validação final.
 *
 * Esta função é pura (sem I/O) — as rotas do Bridge (`/api/integracoes/
 * whatsapp-fornecedores/...`) chamam ela depois de já ter resolvido
 * `fornecedor` a partir do grupo/autor (tabela `import_fontes`), e são
 * responsáveis por: idempotência (`import_mensagens_processadas`),
 * histórico (`import_execucoes`) e aplicação por escopo (ver nota no
 * final do arquivo sobre o que falta implementar).
 */
export function processarMensagemFornecedor(texto: string, fornecedor: Fornecedor): ResultadoProcessamento {
  const classificacao = classificarMensagem(texto, fornecedor);

  if (classificacao.classificacao !== "lista" || !classificacao.tipoLista) {
    return {
      classificacao: classificacao.classificacao,
      tipoLista: null,
      resultado: null,
      motivoIncerteza: classificacao.motivoIncerteza,
    };
  }

  const bruto = executarParser(texto, fornecedor, classificacao.tipoLista);
  const resultado = validarItens(bruto);

  return { classificacao: "lista", tipoLista: classificacao.tipoLista, resultado };
}

function executarParser(texto: string, fornecedor: Fornecedor, tipoLista: NonNullable<ReturnType<typeof classificarMensagem>["tipoLista"]>): ResultadoParser {
  if (fornecedor === "goat") return parseGoat(texto);

  switch (tipoLista) {
    case "apple_lacrados":
    case "apple_seminovos":
      return parseRealezaAppleLacrados(texto);
    case "android":
    case "audio_extras":
      return parseRealezaLinhaUnica(texto, tipoLista);
    case "perfumes":
      return parseRealezaPerfumes(texto);
    default:
      return { itens: [], descartados: [] };
  }
}
