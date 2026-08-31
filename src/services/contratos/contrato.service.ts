import { createClient } from "@/lib/supabase/server";
import { renderizarContrato, encontrarPlaceholdersNaoResolvidos, type DadosContrato } from "./template-engine";
import { gerarPdfContrato } from "./contrato-pdf";
import { formatCurrency, formatDate } from "@/utils";

export interface ModeloContrato {
  id: string;
  nome: string;
  versao: string;
  conteudo: string;
  revisado_juridicamente: boolean;
  ativo: boolean;
  created_at: string;
}

export async function buscarModeloAtivo(): Promise<ModeloContrato | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("contratos_modelos").select("*").eq("ativo", true).maybeSingle();
  return data ?? null;
}

export async function listarModelosContrato(): Promise<ModeloContrato[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("contratos_modelos").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export interface ContratoResumo {
  id: string;
  numero: string;
  status: string;
  cliente_nome: string;
  aparelho_descricao: string | null;
  valor_pagamento: number | null;
  frequencia_pagamento: string | null;
  created_at: string;
}

export async function listarContratos(): Promise<ContratoResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select("id, numero, status, valor_pagamento, frequencia_pagamento, created_at, cliente:clientes(nome), aparelho:aparelhos(imei, produto:produtos(nome))")
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => {
    const cliente = c.cliente as unknown as { nome: string } | null;
    const aparelho = c.aparelho as unknown as { imei: string; produto: { nome: string } | null } | null;
    return {
      id: c.id, numero: c.numero, status: c.status, valor_pagamento: c.valor_pagamento, frequencia_pagamento: c.frequencia_pagamento,
      created_at: c.created_at, cliente_nome: cliente?.nome ?? "—",
      aparelho_descricao: aparelho ? `${aparelho.produto?.nome ?? "Aparelho"} · IMEI ${aparelho.imei}` : null,
    };
  });
}

export interface ContratoDetalhe {
  id: string;
  numero: string;
  status: string;
  nivel_formalizacao: string;
  valor_entrada: number | null;
  frequencia_pagamento: string | null;
  numero_pagamentos: number | null;
  valor_pagamento: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  tem_opcao_aquisicao: boolean;
  valor_opcao_aquisicao: number | null;
  conteudo_final: string | null;
  pdf_url: string | null;
  created_at: string;
  assinado_em: string | null;
  cliente: { id: string; nome: string; cpf: string | null } | null;
  aparelho: { id: string; imei: string; produto_nome: string | null } | null;
  modelo_revisado_juridicamente: boolean;
}

export async function buscarContratoPorId(id: string): Promise<ContratoDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select("*, cliente:clientes(id, nome, cpf), aparelho:aparelhos(id, imei, produto:produtos(nome)), modelo:contratos_modelos(revisado_juridicamente)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const aparelho = data.aparelho as unknown as { id: string; imei: string; produto: { nome: string } | null } | null;
  const modelo = data.modelo as unknown as { revisado_juridicamente: boolean } | null;
  return {
    ...data,
    aparelho: aparelho ? { id: aparelho.id, imei: aparelho.imei, produto_nome: aparelho.produto?.nome ?? null } : null,
    modelo_revisado_juridicamente: modelo?.revisado_juridicamente ?? false,
  } as unknown as ContratoDetalhe;
}

export interface SignatarioContrato {
  id: string;
  papel: string;
  nome: string;
  cpf: string;
  status: string;
  data_hora_assinatura: string | null;
}

export async function listarSignatarios(contratoId: string): Promise<SignatarioContrato[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("contratos_signatarios").select("*").eq("contrato_id", contratoId).order("created_at");
  return data ?? [];
}

export interface DocumentoContrato {
  id: string;
  tipo: string;
  url: string;
  descricao: string | null;
  imutavel: boolean;
  created_at: string;
}

export async function listarDocumentosContrato(contratoId: string): Promise<DocumentoContrato[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("contratos_documentos").select("*").eq("contrato_id", contratoId).order("created_at", { ascending: false });
  return data ?? [];
}

export interface EventoContrato {
  id: string;
  tipo: string;
  observacao: string | null;
  created_at: string;
  usuario_nome: string | null;
}

export async function listarEventosContrato(contratoId: string): Promise<EventoContrato[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("contratos_eventos").select("*, usuario:usuarios(nome)").eq("contrato_id", contratoId).order("created_at", { ascending: false });
  return (data ?? []).map((e) => {
    const usuario = e.usuario as unknown as { nome: string } | null;
    return { id: e.id, tipo: e.tipo, observacao: e.observacao, created_at: e.created_at, usuario_nome: usuario?.nome ?? null };
  });
}

/** Monta os dados pro template a partir do que já está cadastrado — nunca deixa o vendedor digitar CNPJ/endereço da Neotec à mão. */
export async function montarDadosParaTemplate(input: {
  clienteId: string; aparelhoId: string; temFiador: boolean;
  fiadorNome?: string; fiadorCpf?: string; fiadorEndereco?: string; fiadorCidade?: string; fiadorEstado?: string;
  dataInicio: string; dataFim: string; valorEntrada?: number; frequenciaPagamento?: string; numeroPagamentos?: number; valorPagamento?: number;
  temOpcaoAquisicao: boolean; valorOpcaoAquisicao?: number;
}): Promise<{ dados: DadosContrato; erro?: string }> {
  const supabase = await createClient();

  const [{ data: cliente }, { data: aparelho }, { data: loja }] = await Promise.all([
    supabase.from("clientes").select("nome, cpf, endereco, cidade, estado").eq("id", input.clienteId).maybeSingle(),
    supabase.from("aparelhos").select("imei, numero_serie, cor, memoria, condicao, produto:produtos(nome)").eq("id", input.aparelhoId).maybeSingle(),
    supabase.from("lojas").select("razao_social, cnpj, endereco, cidade, estado").maybeSingle(),
  ]);

  if (!cliente) return { dados: null as unknown as DadosContrato, erro: "Cliente não encontrado" };
  if (!aparelho) return { dados: null as unknown as DadosContrato, erro: "Aparelho não encontrado" };
  if (!loja?.razao_social || !loja?.cnpj) return { dados: null as unknown as DadosContrato, erro: "Dados jurídicos da Neotec (razão social/CNPJ) ainda não configurados — vai em Configurações → Empresa antes de gerar contrato." };
  if (!cliente.cpf) return { dados: null as unknown as DadosContrato, erro: "Cliente não tem CPF cadastrado — obrigatório pro contrato." };

  const produtoNome = (aparelho.produto as unknown as { nome: string } | null)?.nome ?? "Aparelho";

  const dados: DadosContrato = {
    numeroContrato: "",
    neotecRazaoSocial: loja.razao_social, neotecCnpj: loja.cnpj, neotecEndereco: loja.endereco ?? "não informado",
    neotecCidade: loja.cidade ?? "não informada", neotecEstado: loja.estado ?? "não informado",
    clienteNome: cliente.nome, clienteCpf: cliente.cpf, clienteEndereco: cliente.endereco ?? "não informado",
    clienteCidade: cliente.cidade ?? "não informada", clienteEstado: cliente.estado ?? "não informado",
    temFiador: input.temFiador, fiadorNome: input.fiadorNome, fiadorCpf: input.fiadorCpf,
    fiadorEndereco: input.fiadorEndereco, fiadorCidade: input.fiadorCidade, fiadorEstado: input.fiadorEstado,
    aparelhoModelo: produtoNome, aparelhoMemoria: aparelho.memoria ?? undefined, aparelhoCor: aparelho.cor ?? undefined,
    aparelhoImei: aparelho.imei, aparelhoSerial: aparelho.numero_serie ?? undefined, aparelhoEstado: aparelho.condicao,
    dataInicio: formatDate(input.dataInicio), dataFim: formatDate(input.dataFim),
    valorEntrada: input.valorEntrada != null ? formatCurrency(input.valorEntrada) : undefined,
    frequenciaPagamento: input.frequenciaPagamento, numeroPagamentos: input.numeroPagamentos,
    valorPagamento: input.valorPagamento != null ? formatCurrency(input.valorPagamento) : undefined,
    temOpcaoAquisicao: input.temOpcaoAquisicao,
    valorOpcaoAquisicao: input.valorOpcaoAquisicao != null ? formatCurrency(input.valorOpcaoAquisicao) : undefined,
    dataAssinatura: formatDate(new Date().toISOString()),
  };

  return { dados };
}

export { renderizarContrato, encontrarPlaceholdersNaoResolvidos, gerarPdfContrato };
