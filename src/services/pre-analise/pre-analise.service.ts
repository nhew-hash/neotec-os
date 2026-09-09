import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PreAnaliseFormValues } from "./pre-analise.schema";

/**
 * Indicador interno — NUNCA mostrado ao cliente, NUNCA aprova/reprova
 * sozinho (pedido explícito do documento). Só ajuda o vendedor a
 * priorizar quem atender primeiro. Heurística simples e transparente,
 * sem inventar peso arbitrário: cada sinal positivo soma 1 ponto.
 */
function calcularIndicador(dados: PreAnaliseFormValues): "bom_potencial" | "analise_manual" | "baixo_potencial" {
  let pontos = 0;

  // Entrada relevante em relação à parcela (sinal de organização financeira).
  if (dados.entrada > 0 && dados.parcelaDesejada > 0 && dados.entrada >= dados.parcelaDesejada * 2) pontos++;

  // Parcela cabe numa fração razoável da renda (< 30% é sinal saudável).
  if (dados.rendaMensal > 0 && dados.parcelaDesejada / dados.rendaMensal <= 0.3) pontos++;

  // Estabilidade profissional.
  if (dados.trabalha && (dados.tempoTrabalho === "1_a_2_anos" || dados.tempoTrabalho === "mais_2_anos")) pontos++;
  if (dados.tipoTrabalho === "clt" && (dados.tempoRegistroClt === "1_a_2_anos" || dados.tempoRegistroClt === "mais_2_anos")) pontos++;

  // Estabilidade de moradia.
  if (dados.tempoMoradia === "1_a_2_anos" || dados.tempoMoradia === "mais_2_anos") pontos++;
  if (dados.moradia === "propria" || dados.moradia === "financiada") pontos++;

  // Aparelho na troca reduz exposição da Neotec.
  if (dados.temAparelhoTroca) pontos++;

  if (pontos >= 5) return "bom_potencial";
  if (pontos >= 3) return "analise_manual";
  return "baixo_potencial";
}

const LABEL_ESTADO_TROCA: Record<string, string> = { excelente: "Excelente", bom: "Bom", regular: "Regular", com_defeito: "Com defeito" };
const LABEL_TIPO_TRABALHO: Record<string, string> = { clt: "CLT", autonomo: "Autônomo", empresario: "Empresário", servidor_publico: "Servidor público", freelancer: "Freelancer", outro: "Outro" };
const LABEL_TEMPO: Record<string, string> = { menos_3_meses: "Menos de 3 meses", "3_a_6_meses": "3 a 6 meses", "6_meses_a_1_ano": "6 meses a 1 ano", "1_a_2_anos": "1 a 2 anos", mais_2_anos: "Mais de 2 anos" };
const LABEL_ESTADO_CIVIL: Record<string, string> = { solteiro: "Solteiro(a)", casado: "Casado(a)", uniao_estavel: "União estável", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)" };
const LABEL_DEPENDENTES: Record<string, string> = { nenhum: "Nenhum", "1": "1", "2": "2", "3_ou_mais": "3 ou mais" };
const LABEL_MORADIA: Record<string, string> = { propria: "Própria", alugada: "Alugada", com_familiares: "Com os pais/familiares", financiada: "Financiada", outro: "Outro" };
const LABEL_TEMPO_MORADIA: Record<string, string> = { menos_6_meses: "Menos de 6 meses", "6_meses_a_1_ano": "6 meses a 1 ano", "1_a_2_anos": "1 a 2 anos", mais_2_anos: "Mais de 2 anos" };

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function montarMensagemWhatsapp(dados: PreAnaliseFormValues): string {
  const linhas = [
    "🟢 NOVA PRÉ-ANÁLISE DE CREDIÁRIO",
    "",
    "👤 CLIENTE",
    `Nome: ${dados.nome}`,
    `WhatsApp: ${dados.whatsapp}`,
    "",
    "📱 APARELHO",
    dados.aparelhoDesejado,
    "",
    "💰 CONDIÇÕES",
    `Entrada: ${formatarMoeda(dados.entrada)}`,
    `Parcela desejada: ${formatarMoeda(dados.parcelaDesejada)}/mês`,
  ];

  if (dados.temAparelhoTroca) {
    linhas.push("", "🔄 APARELHO NA TROCA", "Sim", dados.aparelhoTrocaModelo || "—");
    if (dados.aparelhoTrocaEstado) linhas.push(`Estado: ${LABEL_ESTADO_TROCA[dados.aparelhoTrocaEstado]}`);
    linhas.push(`Defeito: ${dados.aparelhoTrocaDefeito?.trim() || "Nenhum"}`);
  } else {
    linhas.push("", "🔄 APARELHO NA TROCA", "Não");
  }

  linhas.push("", "💼 PROFISSIONAL", `Trabalha: ${dados.trabalha ? "Sim" : "Não"}`);
  if (dados.trabalha) {
    linhas.push(`Tipo: ${dados.tipoTrabalho ? LABEL_TIPO_TRABALHO[dados.tipoTrabalho] : "—"}`);
    linhas.push(`Tempo: ${dados.tempoTrabalho ? LABEL_TEMPO[dados.tempoTrabalho] : "—"}`);
  }
  linhas.push(`Renda: ${formatarMoeda(dados.rendaMensal)}/mês`);

  linhas.push(
    "", "👨‍👩‍👧 FAMÍLIA",
    `Estado civil: ${LABEL_ESTADO_CIVIL[dados.estadoCivil]}`,
    `Dependentes: ${LABEL_DEPENDENTES[dados.dependentes]}`,
    "", "🏠 MORADIA",
    LABEL_MORADIA[dados.moradia],
    `Tempo: ${LABEL_TEMPO_MORADIA[dados.tempoMoradia]}`,
    "", "🔗 ORIGEM", "Pré-Crediário Neotec",
  );

  return linhas.join("\n");
}

/** Público — sem sessão, usa admin client só pra ler nome de produto (nunca dado sensível). Puxa os modelos reais do catálogo em vez de lista fixa no código. */
export async function listarModelosIphoneDisponiveisPublico(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("produtos").select("nome").eq("categoria", "iphone").order("nome");
  const nomes = [...new Set((data ?? []).map((p) => p.nome))];
  return nomes.length > 0 ? nomes : ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 17"];
}

export async function criarPreAnalise(dados: PreAnaliseFormValues): Promise<{ id: string }> {
  const admin = createAdminClient(); // formulário público, sem sessão de usuário — precisa da service role pra inserir
  const indicador = calcularIndicador(dados);
  const whatsappLimpo = dados.whatsapp.replace(/\D/g, "");

  const { data, error } = await admin.from("crediario_pre_analises").insert({
    nome: dados.nome, whatsapp: whatsappLimpo, aparelho_desejado: dados.aparelhoDesejado,
    entrada: dados.entrada, parcela_desejada: dados.parcelaDesejada,
    tem_aparelho_troca: dados.temAparelhoTroca, aparelho_troca_modelo: dados.aparelhoTrocaModelo || null,
    aparelho_troca_estado: dados.aparelhoTrocaEstado || null, aparelho_troca_defeito: dados.aparelhoTrocaDefeito || null,
    trabalha: dados.trabalha, tipo_trabalho: dados.tipoTrabalho || null, tempo_trabalho: dados.tempoTrabalho || null,
    tempo_registro_clt: dados.tempoRegistroClt || null, renda_mensal: dados.rendaMensal,
    estado_civil: dados.estadoCivil, dependentes: dados.dependentes, moradia: dados.moradia, tempo_moradia: dados.tempoMoradia,
    termo_aceito: dados.termoAceito, termo_aceito_em: new Date().toISOString(), indicador,
  }).select("id").single();

  if (error) throw new Error(error.message);

  // Notificação de WhatsApp pro vendedor — reaproveita a integração
  // da loja que já existe, nunca cria uma nova. Se falhar, nunca
  // impede o cadastro (o lead já está salvo, o vendedor ainda consegue
  // ver na tela de Crediário mesmo sem a notificação chegar).
  try {
    const { data: politica } = await admin.from("crediario_politicas").select("whatsapp_notificacao_vendedor").eq("id", "default").maybeSingle();
    if (politica?.whatsapp_notificacao_vendedor) {
      const { enviarTexto } = await import("@/services/whatsapp/whatsapp.api");
      const resultado = await enviarTexto(politica.whatsapp_notificacao_vendedor, montarMensagemWhatsapp(dados));
      if (resultado.enviado) await admin.from("crediario_pre_analises").update({ notificacao_enviada: true }).eq("id", data.id);
    }
  } catch (err) {
    console.error("Falha ao notificar vendedor sobre nova pré-análise:", err);
  }

  return { id: data.id };
}

export interface PreAnaliseResumo {
  id: string; nome: string; whatsapp: string; aparelho_desejado: string; entrada: number; parcela_desejada: number;
  renda_mensal: number; trabalha: boolean; status: string; indicador: string | null; created_at: string;
}

export async function listarPreAnalises(): Promise<PreAnaliseResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crediario_pre_analises")
    .select("id, nome, whatsapp, aparelho_desejado, entrada, parcela_desejada, renda_mensal, trabalha, status, indicador, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface PreAnaliseDetalhe extends PreAnaliseResumo {
  tem_aparelho_troca: boolean; aparelho_troca_modelo: string | null; aparelho_troca_estado: string | null; aparelho_troca_defeito: string | null;
  tipo_trabalho: string | null; tempo_trabalho: string | null; tempo_registro_clt: string | null;
  estado_civil: string; dependentes: string; moradia: string; tempo_moradia: string;
  observacoes_internas: string | null; notificacao_enviada: boolean;
}

export async function buscarPreAnalisePorId(id: string): Promise<PreAnaliseDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_pre_analises").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export { LABEL_ESTADO_TROCA, LABEL_TIPO_TRABALHO, LABEL_TEMPO, LABEL_ESTADO_CIVIL, LABEL_DEPENDENTES, LABEL_MORADIA, LABEL_TEMPO_MORADIA };
