/**
 * Motor de template de contrato — substitui {{PLACEHOLDER}} e resolve
 * blocos condicionais {{SE_X}}...{{FIM_X}}. Puramente mecânico, nunca
 * decide redação jurídica — só preenche o que o modelo (aprovado ou
 * provisório) já contém.
 */

export interface DadosContrato {
  numeroContrato: string;
  neotecRazaoSocial: string;
  neotecCnpj: string;
  neotecEndereco: string;
  neotecCidade: string;
  neotecEstado: string;
  clienteNome: string;
  clienteCpf: string;
  clienteEndereco: string;
  clienteCidade: string;
  clienteEstado: string;
  temFiador: boolean;
  fiadorNome?: string;
  fiadorCpf?: string;
  fiadorEndereco?: string;
  fiadorCidade?: string;
  fiadorEstado?: string;
  aparelhoModelo: string;
  aparelhoMemoria?: string;
  aparelhoCor?: string;
  aparelhoImei: string;
  aparelhoSerial?: string;
  aparelhoEstado?: string;
  dataInicio: string;
  dataFim: string;
  valorEntrada?: string;
  frequenciaPagamento?: string;
  numeroPagamentos?: number;
  valorPagamento?: string;
  temOpcaoAquisicao: boolean;
  valorOpcaoAquisicao?: string;
  dataAssinatura: string;
}

/** Resolve um bloco condicional {{SE_X}}...{{FIM_X}} — remove o bloco inteiro (incluindo as próprias tags) se a condição for falsa, ou só remove as tags (mantendo o conteúdo) se verdadeira. */
function resolverBlocoCondicional(texto: string, tag: string, condicaoVerdadeira: boolean): string {
  const regex = new RegExp(`\\{\\{SE_${tag}\\}\\}([\\s\\S]*?)\\{\\{FIM_${tag}\\}\\}`, "g");
  return texto.replace(regex, condicaoVerdadeira ? "$1" : "");
}

export function renderizarContrato(templateBruto: string, dados: DadosContrato): string {
  let texto = templateBruto;

  // Blocos condicionais primeiro — sempre antes da substituição de
  // placeholder simples, senão um bloco removido ainda com
  // {{PLACEHOLDER}} dentro tentaria ser substituído à toa.
  texto = resolverBlocoCondicional(texto, "FIADOR", dados.temFiador);
  texto = resolverBlocoCondicional(texto, "OPCAO_AQUISICAO", dados.temOpcaoAquisicao);

  const substituicoes: Record<string, string> = {
    NUMERO_CONTRATO: dados.numeroContrato,
    NEOTEC_RAZAO_SOCIAL: dados.neotecRazaoSocial,
    NEOTEC_CNPJ: dados.neotecCnpj,
    NEOTEC_ENDERECO: dados.neotecEndereco,
    NEOTEC_CIDADE: dados.neotecCidade,
    NEOTEC_ESTADO: dados.neotecEstado,
    CLIENTE_NOME: dados.clienteNome,
    CLIENTE_CPF: dados.clienteCpf,
    CLIENTE_ENDERECO: dados.clienteEndereco,
    CLIENTE_CIDADE: dados.clienteCidade,
    CLIENTE_ESTADO: dados.clienteEstado,
    FIADOR_NOME: dados.fiadorNome ?? "",
    FIADOR_CPF: dados.fiadorCpf ?? "",
    FIADOR_ENDERECO: dados.fiadorEndereco ?? "",
    FIADOR_CIDADE: dados.fiadorCidade ?? "",
    FIADOR_ESTADO: dados.fiadorEstado ?? "",
    APARELHO_MODELO: dados.aparelhoModelo,
    APARELHO_MEMORIA: dados.aparelhoMemoria ?? "não informado",
    APARELHO_COR: dados.aparelhoCor ?? "não informada",
    APARELHO_IMEI: dados.aparelhoImei,
    APARELHO_SERIAL: dados.aparelhoSerial ?? "não informado",
    APARELHO_ESTADO: dados.aparelhoEstado ?? "não informado",
    DATA_INICIO: dados.dataInicio,
    DATA_FIM: dados.dataFim,
    VALOR_ENTRADA: dados.valorEntrada ?? "não aplicável",
    FREQUENCIA_PAGAMENTO: dados.frequenciaPagamento ?? "não informada",
    NUMERO_PAGAMENTOS: dados.numeroPagamentos != null ? String(dados.numeroPagamentos) : "não informado",
    VALOR_PAGAMENTO: dados.valorPagamento ?? "não informado",
    VALOR_OPCAO_AQUISICAO: dados.valorOpcaoAquisicao ?? "não aplicável",
    DATA_ASSINATURA: dados.dataAssinatura,
  };

  for (const [chave, valor] of Object.entries(substituicoes)) {
    texto = texto.replaceAll(`{{${chave}}}`, valor);
  }

  return texto;
}

/** Confere se sobrou algum {{PLACEHOLDER}} sem substituir — sinal de dado faltando, nunca deveria gerar contrato assim. */
export function encontrarPlaceholdersNaoResolvidos(textoRenderizado: string): string[] {
  const matches = textoRenderizado.match(/\{\{[A-Z_]+\}\}/g);
  return matches ? [...new Set(matches)] : [];
}
