import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveAIProvider } from "@/services/ia/providers/ia-provider-resolver";
import { enviarMensagemProstec } from "./prostec-whatsapp.provider";
import { paraFormatoInternacionalBR } from "@/utils/telefone";
import { PRODUTOS_PROSTEC_PADRAO, type ProdutoProstecDados } from "../lib/produtos-padrao";

/**
 * IARA — agente comercial de IA da Prostec. Substitui o bot scripted
 * anterior (Fase 201) por uma conversa de verdade, com memória
 * persistente, decisão comercial, e limites rígidos (nunca inventa
 * preço/desconto/prazo — só o que está em prostec_oferta).
 *
 * Regra de propriedade da conversa: só quem é "dono" (ai/human) pode
 * responder. "paused" nunca gera resposta automática — evita duas
 * respostas simultâneas (Iara + operador).
 */

const LIMITE_MENSAGENS_POR_HORA = 20; // trava de segurança — muitas mensagens seguidas geralmente indica erro de loop, não conversa real

// Duplicado de src/services/ia/ia.service.ts de propósito — evita
// mexer no arquivo compartilhado da loja só por causa da Prostec.
const CUSTO_POR_MIL_TOKENS: Record<string, { entrada: number; saida: number }> = {
  "gpt-4o-mini": { entrada: 0.00015, saida: 0.0006 },
  "gpt-4o": { entrada: 0.0025, saida: 0.01 },
  "claude-sonnet-4-5": { entrada: 0.003, saida: 0.015 },
  "claude-haiku-4-5": { entrada: 0.0008, saida: 0.004 },
};

function estimarCustoIara(modelo: string, tokensEntrada?: number, tokensSaida?: number): number | null {
  const precos = CUSTO_POR_MIL_TOKENS[modelo];
  if (!precos || tokensEntrada == null || tokensSaida == null) return null;
  return (tokensEntrada / 1000) * precos.entrada + (tokensSaida / 1000) * precos.saida;
}

interface DecisaoIara {
  resposta: string;
  intent: string;
  novo_status_lead: string | null;
  motivo_perda: string | null;
  nova_temperatura: "quente" | "morno" | "frio" | null;
  objecao: string | null;
  proxima_acao: string;
  pedido_fora_limite: boolean;
  exige_atencao_humana: boolean;
  motivo_atencao: string | null;
  gerar_proposta: boolean;
  nao_contatar: boolean;
  /** Percentual de desconto que a resposta menciona oferecer ao cliente — 0 quando não há desconto na resposta. Validado deterministicamente pelo código antes de enviar (nunca confia só na IA calcular isso sozinha). */
  desconto_oferecido_pct: number;
  /** Código (slug) do produto do catálogo que a conversa está focada agora — usado pra validar desconto contra o limite DAQUELE produto e pra saber qual gerar quando gerar_proposta=true. null se ainda não decidiu qual produto faz sentido. */
  produto_interesse: string | null;
}

const STATUS_VALIDOS = ["novo", "contato_realizado", "qualificado", "reuniao", "proposta_enviada", "negociacao", "venda_fechada", "perdido"];

function montarCatalogoTexto(produtos: ProdutoProstecDados[]): string {
  return produtos
    .map((p, i) => {
      const linhaPreco =
        p.tipo_cobranca === "mensal"
          ? p.valor_manutencao_mensal > 0
            ? `Taxa de integração (cobrança única, na implantação): R$ ${p.preco} | Manutenção mensal (a partir do 2º mês): R$ ${p.valor_manutencao_mensal}/mês`
            : `R$ ${p.preco}/mês`
          : `R$ ${p.preco} (pagamento único)`;
      return `${i + 1}. ${p.nome} (código: ${p.id})
   - O que é: ${p.descricao_curta}
   - Quando indicar pra esse lead: ${p.quando_recomendar}
   - Preço: ${linhaPreco}
   - Pagamento: ${p.formas_pagamento}
   - Prazo: ${p.prazo_entrega}
   - Incluso: ${p.incluso}
   - Não incluso: ${p.nao_incluso}
   - Desconto máximo que você pode oferecer sozinha nesse produto: ${p.desconto_maximo_automatico_pct}%
   - Parcelamento máximo: ${p.parcelamento_maximo}x`;
    })
    .join("\n\n");
}

function montarPromptSistema(produtos: ProdutoProstecDados[]): string {
  return `Você é a Iara, consultora comercial da Neotec — vende soluções digitais pra empresas locais em Araguari e região.

PERSONALIDADE E TOM (o objetivo é soar o mais humana possível, nunca robótica):
- Escreve como gente de verdade manda WhatsApp: frases curtas, direto ao ponto, com contrações naturais ("tá", "pra", "você já", "vi que"). Nunca soa como e-mail corporativo, nunca usa "prezado", "cordialmente", linguagem de departamento de marketing.
- Uma ideia por mensagem. Uma pergunta por vez, no máximo. Nunca despeja três perguntas ou uma parede de texto.
- Varia a forma de cumprimentar e de fechar frases — nunca repete a mesma estrutura duas vezes na mesma conversa.
- Emoji com moderação (0 ou 1 por mensagem, nunca mais), só quando soar natural.
- Se perguntarem diretamente se você é uma IA/robô: confirma com naturalidade, sem se desculpar por isso e sem fingir ser humana — e continua a conversa normalmente, sem virar assunto principal.

COMO VENDER DE VERDADE (você é consultora, não folheto — e você vende um CATÁLOGO de produtos, não só site):
- Seu trabalho não é "empurrar site" pra todo mundo — é entender rapidinho a situação da empresa e recomendar o produto do catálogo abaixo que resolve a dor REAL dela, usando o que você já sabe sobre ela (segmento, cidade, se já tem site, o campo "Oportunidade identificada" no contexto). Empresa sem site nenhum? Sugira site. Empresa que já vende bem mas manda foto solta de produto no WhatsApp? Catálogo digital. Empresa afogada em mensagem repetida? Robô de automação. Empresa que vende bem mas perde cliente por falta de organização? CRM. Empresa só ativa no Instagram? Link na bio. Pode sugerir mais de um produto se fizer sentido pra empresa, mas NUNCA despeja o catálogo inteiro de uma vez — puxa pelo que parece mais urgente pra ela primeiro.
- Fale de consequência de negócio (vendas perdidas, tempo perdido respondendo sempre a mesma coisa, cliente esquecido, credibilidade, concorrência), nunca de recurso técnico (não venda "responsivo", "SEO", "hospedagem", "automação" como palavra solta — traduza tudo pra "cliente te acha no Google", "para de perder tempo respondendo a mesma pergunta", "não esquece mais de retornar um cliente").
- Personalize com o que você sabe da empresa (nome, segmento, cidade, se já tem site ou não) — nunca manda mensagem genérica que serviria pra qualquer empresa.
- Objeção NÃO é rejeição. "Vou pensar", "tá caro", "não é prioridade agora", "já tenho Instagram", "preciso ver com meu sócio" são pontos de venda normais — responde com uma pergunta ou argumento de valor, sem pressão e sem repetir a mesma frase, e continua a conversa. Só marca novo_status_lead=perdido quando o cliente for claro e definitivo (ex: "não tenho interesse, obrigado" de forma final, ou depois de já ter respondido a objeção e ele recusar de novo).
- "Já tenho Instagram/Facebook" não é motivo pra desistir: site profissional complementa rede social (parece mais sério, aparece no Google, não depende do algoritmo) — use isso como argumento, não como derrota.
- Nunca implora, nunca manda "só mais uma coisa", nunca manda mensagem de cobrança tipo "você viu minha mensagem?". Se o cliente não responde, isso NÃO é um evento que gera resposta sua — só responde quando ele escrever de novo.

⚠️ QUANDO MARCAR nao_contatar=true (critério RÍGIDO — errar aqui bloqueia a empresa de vez, sem volta fácil):
Só marque nao_contatar=true quando o cliente pedir EXPLICITAMENTE, em texto claro, pra parar de receber mensagens — algo do tipo "para de mandar mensagem", "não me contate mais", "me tira dessa lista", "não mande mais nada", "pare de me chamar".
NÃO marque nao_contatar=true para: "não tenho interesse (agora)", "não preciso disso", "não, obrigado", "tá caro", "não quero", "não é pra mim", silêncio do cliente, ou qualquer objeção de venda comum. Essas situações são recusa normal de venda — marque novo_status_lead=perdido se for definitivo, mas a empresa continua podendo ser contatada numa campanha futura. Na dúvida, NÃO marque nao_contatar — é sempre mais seguro deixar uma objeção sem bloquear do que bloquear um pedido que não era pra bloquear.

CATÁLOGO DE PRODUTOS (única fonte de verdade — NUNCA afirme preço, desconto, prazo ou condição de nenhum produto fora do que está listado aqui):

${montarCatalogoTexto(produtos)}

REGRAS RÍGIDAS:
- NUNCA invente preço, desconto, prazo, garantia, funcionalidade, resultado, número de clientes atendidos ou depoimento que não estejam listados acima.
- NUNCA misture dado de um produto com outro (ex.: não fale o prazo do site quando o assunto é catálogo digital).
- Produto com taxa de integração + manutenção mensal: deixe SEMPRE claro que são dois valores diferentes — quanto se paga uma vez no início (integração/implantação) e quanto se paga por mês depois disso (manutenção). Nunca junte os dois numa frase que soe como um valor único.
- Se o cliente pedir desconto/condição ACIMA do limite daquele produto, ou algo que você não tem informação pra responder com segurança: marque pedido_fora_limite=true e exige_atencao_humana=true, e responda de forma natural que vai verificar com o time (sem prometer nada específico).
- Nunca finja ser humana se perguntarem diretamente.

Responda SEMPRE em JSON válido, sem texto fora do JSON, neste formato exato:
{
  "resposta": "texto que a Iara vai mandar pro cliente",
  "intent": "uma palavra/frase curta descrevendo a intenção do cliente nessa mensagem",
  "novo_status_lead": "um destes: ${STATUS_VALIDOS.join(" | ")} — ou null se não deve mudar",
  "motivo_perda": "motivo se novo_status_lead for perdido, senão null",
  "nova_temperatura": "quente | morno | frio | null",
  "objecao": "objeção identificada nessa mensagem, ou null",
  "proxima_acao": "o que fazer a seguir, resumido",
  "pedido_fora_limite": true ou false,
  "exige_atencao_humana": true ou false,
  "motivo_atencao": "motivo se exige_atencao_humana, senão null",
  "gerar_proposta": true ou false (true só se o cliente pediu explicitamente a proposta/orçamento por escrito de um produto específico),
  "nao_contatar": true ou false — RÍGIDO: só true se o cliente pediu EXPLICITAMENTE pra parar de receber mensagens (ver critério acima); objeção/desinteresse normal é novo_status_lead=perdido, NÃO nao_contatar,
  "desconto_oferecido_pct": número (0 se a resposta não menciona nenhum desconto, ou o percentual exato se mencionar),
  "produto_interesse": "código de UM produto do catálogo acima (ex: \"site\", \"catalogo_digital\", \"robo_chat\", \"crm\", \"link_bio\") que essa conversa está focada agora, ou null se ainda não ficou claro qual produto interessa"
}`;
}

interface ResultadoDecisao {
  decisao: DecisaoIara;
  tokensEntrada?: number;
  tokensSaida?: number;
  modelo: string;
}

async function decidirProximaAcao(contexto: {
  empresa: string; segmento: string; cidade: string; score: number; temperatura: string;
  possuiSite: boolean; motivoOportunidade: string; etapaAtual: string; resumoContexto: string | null;
  historico: { remetente: string; conteudo: string }[]; mensagemNova: string;
}): Promise<ResultadoDecisao | null> {
  const admin = createAdminClient();
  const { data: produtosData } = await admin.from("prostec_produtos").select("*").eq("ativo", true).order("ordem", { ascending: true });
  const produtos = produtosData && produtosData.length > 0 ? (produtosData as ProdutoProstecDados[]) : PRODUTOS_PROSTEC_PADRAO;
  if (produtos.length === 0) return null;

  const historicoTexto = contexto.historico.slice(-12).map((m) => `${m.remetente === "lead" ? "Cliente" : "Iara"}: ${m.conteudo}`).join("\n");

  const promptUsuario = `CONTEXTO DO LEAD:
Empresa: ${contexto.empresa}
Segmento: ${contexto.segmento}
Cidade: ${contexto.cidade}
Score: ${contexto.score}
Temperatura: ${contexto.temperatura}
Site: ${contexto.possuiSite ? "Possui" : "Não possui"}
Oportunidade identificada: ${contexto.motivoOportunidade}
Etapa atual no CRM: ${contexto.etapaAtual}
${contexto.resumoContexto ? `Resumo do que já foi conversado: ${contexto.resumoContexto}` : ""}

HISTÓRICO RECENTE DA CONVERSA:
${historicoTexto || "(início da conversa)"}

NOVA MENSAGEM DO CLIENTE:
"${contexto.mensagemNova}"

Decida a resposta e a atualização de CRM, seguindo o formato JSON exato definido no system prompt.`;

  try {
    const { provider, config } = await getActiveAIProvider();
    const resultado = await provider.completar({
      sistema: montarPromptSistema(produtos),
      prompt: promptUsuario,
      formatoJson: true,
      temperatura: 0.4,
      maxTokens: 600,
    });

    const decisao = JSON.parse(resultado.texto.replace(/```json|```/g, "").trim()) as DecisaoIara;

    // Nunca confia cegamente no código de produto que a IA devolveu —
    // se não bater com nenhum produto ativo do catálogo, trata como
    // "ainda não decidiu" em vez de deixar um slug inválido vazar pro
    // resto do fluxo (validação de desconto, geração de proposta).
    const produtoFoco = produtos.find((p) => p.id === decisao.produto_interesse) ?? null;
    if (decisao.produto_interesse && !produtoFoco) decisao.produto_interesse = null;

    // Validação determinística — NUNCA confia só na IA calcular sozinha
    // se o desconto está dentro do limite DAQUELE produto específico.
    // Confere o número que ela mesma retornou contra o limite real
    // configurado; se ultrapassar (ou se nem deu pra saber qual produto
    // é, e ainda assim ofereceu desconto), sobrescreve a decisão pra
    // escalar, mesmo que a IA não tenha marcado pedido_fora_limite
    // corretamente.
    const limiteDescontoProduto = produtoFoco?.desconto_maximo_automatico_pct ?? 0;
    if (decisao.desconto_oferecido_pct > limiteDescontoProduto) {
      decisao.pedido_fora_limite = true;
      decisao.exige_atencao_humana = true;
      decisao.motivo_atencao = `Iara ia oferecer ${decisao.desconto_oferecido_pct}% de desconto${produtoFoco ? ` em "${produtoFoco.nome}"` : ""}, acima do limite configurado (${limiteDescontoProduto}%) — bloqueado antes de enviar.`;
    }

    // Validação determinística — NUNCA confia só na IA decidir opt-out
    // sozinha. nao_contatar bloqueia a empresa de contato pra SEMPRE
    // (registro global em prostec_opt_out), e uma objeção normal de
    // venda ("não tenho interesse", "tá caro") não é a mesma coisa que
    // "não me contate mais". Só deixa passar como opt-out de verdade se
    // o texto do próprio cliente contiver um pedido explícito de parar
    // de ser contatado — senão, rebaixa pra "precisa de atenção humana"
    // em vez de bloquear sozinha por interpretação errada da IA.
    if (decisao.nao_contatar) {
      const pedidoExplicitoDeParar = /(n[aã]o\s*(me\s*)?(contat[ae]|mand[ae]|chame|escreva)\s*mais|pare\s*de\s*(me\s*)?(mandar|chamar|contatar|enviar)|para\s*de\s*(me\s*)?(mandar|chamar|contatar|enviar)|(me\s*)?(tira|remov[ae]|exclu[ai])\s*(da\s*lista|do\s*contato)|descadastr|n[aã]o\s*quero\s*mais\s*receber|sair\s*da\s*lista|bloqueia\s*(meu\s*)?n[uú]mero)/i.test(
        contexto.mensagemNova
      );
      if (!pedidoExplicitoDeParar) {
        decisao.nao_contatar = false;
        decisao.exige_atencao_humana = true;
        decisao.motivo_atencao = `Iara ia marcar "não contatar mais" mas a mensagem do cliente ("${contexto.mensagemNova.slice(0, 200)}") não tem um pedido explícito disso — verificar manualmente antes de bloquear o contato de vez.`;
      }
    }

    return { decisao, tokensEntrada: resultado.tokensEntrada, tokensSaida: resultado.tokensSaida, modelo: config.modelo };
  } catch {
    return null; // se a IA falhar, nunca inventa decisão — quem chama trata como "precisa de atenção humana"
  }
}

async function podeEnviarMensagemReal(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("integracoes_whatsapp_prostec").select("modo_operacao, iara_ativa").maybeSingle();
  if (data?.iara_ativa === false) return false;
  return data?.modo_operacao !== "teste";
}

async function registrarMensagem(conversaId: string, remetente: "lead" | "bot" | "vendedor", conteudo: string, iaGerada: boolean) {
  const admin = createAdminClient();
  await admin.from("prostec_mensagens").insert({ conversa_id: conversaId, remetente, conteudo, ia_gerada: iaGerada });
  await admin.from("prostec_conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", conversaId);
}

/** Inicia a conversa — chamado quando o vendedor "manda pra Iara" um lead. */
/**
 * Circuit breaker (Fase 5) — se a IA falhar demais em sequência num
 * intervalo curto, é sinal de algo genuinamente errado (chave de API
 * inválida, provedor fora do ar) — não adianta continuar tentando
 * silenciosamente. Pausa a Iara inteira sozinha, registra o motivo,
 * deixa pro operador investigar e reativar manualmente.
 */
async function verificarCircuitBreakerErroIA(admin: ReturnType<typeof createAdminClient>) {
  await admin.from("prostec_anomalias").insert({ tipo: "taxa_erro_ia", descricao: "Iara falhou ao processar uma mensagem" });

  const { data: config } = await admin.from("integracoes_whatsapp_prostec").select("id, limite_erro_ia_consecutivo, iara_ativa").maybeSingle();
  if (!config || !config.iara_ativa) return; // já pausada, não repete o aviso

  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count } = await admin.from("prostec_anomalias").select("*", { count: "exact", head: true }).eq("tipo", "taxa_erro_ia").gte("created_at", cincoMinAtras);

  if ((count ?? 0) >= config.limite_erro_ia_consecutivo) {
    await admin.from("integracoes_whatsapp_prostec").update({
      iara_ativa: false, pausado_automaticamente: true,
      motivo_pausa_automatica: `${count} falhas de IA nos últimos 5 minutos — pausada automaticamente pra evitar mais erro.`,
    }).eq("id", config.id);
    await admin.from("prostec_anomalias").insert({
      tipo: "taxa_erro_ia", descricao: "Sistema pausado automaticamente por excesso de falhas consecutivas",
      valor_observado: count, limite_configurado: config.limite_erro_ia_consecutivo, pausou_sistema: true,
    });
  }
}

export async function iniciarConversaBot(leadId: string, telefoneBruto: string, nomeEmpresa: string): Promise<{ sucesso: boolean; motivo?: string }> {
  const admin = createAdminClient();

  // O telefone chega aqui em qualquer formato (o Google Places devolve
  // "+55 34 99999-8888", com espaços e pontuação). O Bridge, quando uma
  // resposta chega de verdade, manda só dígitos com "55" na frente (tirado
  // direto do JID do Baileys). Se guardássemos o formato bruto, a conversa
  // nunca seria encontrada de novo na hora da resposta — o bot "começava"
  // mas nunca "continuava". Normaliza pra um formato único (dígitos + 55)
  // ANTES de gravar ou consultar qualquer coisa por telefone.
  const telefone = paraFormatoInternacionalBR(telefoneBruto);

  const { data: optOut } = await admin.from("prostec_opt_out").select("telefone").eq("telefone", telefone).maybeSingle();
  if (optOut) return { sucesso: false, motivo: "Esse número pediu pra não ser mais contatado — bloqueado, não é possível iniciar conversa nova." };

  const { data: conversa, error } = await admin.from("prostec_conversas").upsert(
    { lead_id: leadId, telefone, propriedade: "ai", status: "aberta" },
    { onConflict: "telefone" }
  ).select("id").single();
  if (error) return { sucesso: false, motivo: error.message };

  const { data: lead } = await admin.from("prostec_leads").select("reasons, company:prostec_companies(origem)").eq("id", leadId).maybeSingle();
  const motivoOportunidade = (lead?.reasons as string[] | null)?.[0] ?? "notei uma boa oportunidade de presença digital pra vocês";
  // Fase 229/7 — leads captados pelo scraper (contato "frio", nunca
  // solicitou nada) precisam de opção de opt-out clara já na primeira
  // mensagem. Leads de outras origens mantêm o texto de sempre.
  const origemCompany = (lead?.company as { origem?: string } | { origem?: string }[] | null | undefined);
  const origem = Array.isArray(origemCompany) ? origemCompany[0]?.origem : origemCompany?.origem;
  const sufixoOptOut = origem === "gmaps_scraper" ? " Se preferir não receber mais contato, é só responder SAIR." : "";

  // A/B test (Fase 7) — se tiver experimento ativo, escolhe uma
  // variante aleatória pra mensagem de abertura em vez do texto fixo.
  // Sem experimento ativo, usa a abordagem padrão normalmente.
  const { data: experimentoAtivo } = await admin.from("prostec_experimentos").select("id, variantes:prostec_experimento_variantes(*)").eq("status", "ativo").limit(1).maybeSingle();
  const variantes = (experimentoAtivo?.variantes as { id: string; texto_mensagem: string }[] | undefined) ?? [];
  const varianteEscolhida = variantes.length > 0 ? variantes[Math.floor(Math.random() * variantes.length)] : null;

  const texto = (varianteEscolhida
    ? varianteEscolhida.texto_mensagem.replace("{empresa}", nomeEmpresa).replace("{motivo}", motivoOportunidade)
    : `Olá! Tudo bem? Falo da Neotec. Posso falar rapidamente com o responsável pela ${nomeEmpresa}? ${motivoOportunidade}.`) + sufixoOptOut;

  if (!(await podeEnviarMensagemReal())) {
    await registrarMensagem(conversa.id, "bot", `[MODO TESTE — não enviado de verdade] ${texto}`, true);
    return { sucesso: true };
  }

  const resultado = await enviarMensagemProstec(telefone, texto);
  if (!resultado.enviado) return { sucesso: false, motivo: resultado.motivo };

  await registrarMensagem(conversa.id, "bot", texto, true);
  await admin.from("prostec_leads").update({
    status: "contato_realizado", experimento_variante_id: varianteEscolhida?.id ?? null,
  }).eq("id", leadId);
  if (varianteEscolhida) {
    const { data: atual } = await admin.from("prostec_experimento_variantes").select("enviadas").eq("id", varianteEscolhida.id).maybeSingle();
    await admin.from("prostec_experimento_variantes").update({ enviadas: (atual?.enviadas ?? 0) + 1 }).eq("id", varianteEscolhida.id);
  }
  await admin.from("prostec_atividades").insert({ lead_id: leadId, tipo: "contato", descricao: "🤖 Iara iniciou contato via WhatsApp" });

  return { sucesso: true };
}

/** Processa uma mensagem recebida — a Iara decide, responde, atualiza CRM, registra a decisão. */
export async function processarMensagemRecebidaIara(telefoneBruto: string, textoRecebido: string, telefoneConfiavel = true): Promise<void> {
  // Trava de segurança — texto vazio nunca é mensagem de verdade do
  // WhatsApp (não dá pra mandar texto em branco); é sinal de a Bridge
  // ter repassado um evento que não é mensagem real (reação, apagar
  // mensagem, enquete etc.). Ignora antes de gastar chamada de IA ou
  // criar qualquer registro em cima disso.
  if (!textoRecebido?.trim()) return;

  const admin = createAdminClient();

  // Mesma normalização de iniciarConversaBot — garante que bate com o
  // que foi gravado em prostec_conversas.telefone, seja qual for o
  // formato que o Bridge mandou (normalmente já vem limpo, mas não custa
  // garantir).
  const telefone = paraFormatoInternacionalBR(telefoneBruto);

  const { data: conversa } = await admin
    .from("prostec_conversas")
    .select("*, lead:prostec_leads(id, segment, score, temperature, status, reasons, site_analysis, company:prostec_companies(name, city))")
    .eq("telefone", telefone)
    .maybeSingle();
  if (!conversa) {
    // Antes isso morria em silêncio sempre. Se o telefone não é
    // confiável (veio de um LID do WhatsApp que o Bridge não conseguiu
    // resolver pro número real — ver prostec-whatsapp.provider e o
    // Bridge), registra como anomalia visível em vez de simplesmente
    // sumir: essa mensagem existiu, chegou, e ninguém vai saber que
    // existiu se não ficar registrada em algum lugar.
    if (!telefoneConfiavel) {
      await admin.from("prostec_anomalias").insert({
        tipo: "outro",
        descricao: `Mensagem recebida de um contato com LID não resolvido (telefone real desconhecido) — texto: "${textoRecebido.slice(0, 200)}". Verificar manualmente pelo WhatsApp conectado.`,
      });
    }
    return; // número não é lead da Prostec (ou telefone não resolvido) — ignora
  }

  await registrarMensagem(conversa.id, "lead", textoRecebido, false);
  await admin.from("prostec_conversas").update({ nao_lidas: conversa.nao_lidas + 1 }).eq("id", conversa.id);

  // A/B test (Fase 7) — conta como "respondida" só na primeira resposta do lead nessa conversa.
  const { data: leadDados } = await admin.from("prostec_leads").select("experimento_variante_id").eq("id", conversa.lead_id ?? "").maybeSingle();
  if (leadDados?.experimento_variante_id) {
    const { count: totalRespostasLead } = await admin.from("prostec_mensagens").select("*", { count: "exact", head: true }).eq("conversa_id", conversa.id).eq("remetente", "lead");
    if (totalRespostasLead === 1) {
      const { data: varianteAtual } = await admin.from("prostec_experimento_variantes").select("respondidas").eq("id", leadDados.experimento_variante_id).maybeSingle();
      await admin.from("prostec_experimento_variantes").update({ respondidas: (varianteAtual?.respondidas ?? 0) + 1 }).eq("id", leadDados.experimento_variante_id);
    }
  }

  if (conversa.nao_contatar) return; // cliente pediu pra não receber mensagem — nunca mais responde automaticamente
  if (conversa.propriedade !== "ai") return; // conversa com humano ou pausada — Iara não interfere

  // Trava de segurança — muitas mensagens numa hora é sinal de loop/erro, não conversa real.
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: mensagensNaUltimaHora } = await admin.from("prostec_mensagens").select("*", { count: "exact", head: true }).eq("conversa_id", conversa.id).eq("remetente", "bot").gte("enviada_em", umaHoraAtras);
  if ((mensagensNaUltimaHora ?? 0) >= LIMITE_MENSAGENS_POR_HORA) {
    await admin.from("prostec_conversas").update({ propriedade: "paused", exige_atencao: true, motivo_atencao: "Limite de mensagens por hora atingido — possível loop" }).eq("id", conversa.id);
    return;
  }

  const lead = conversa.lead as unknown as {
    id: string; segment: string; score: number; temperature: string; status: string; reasons: string[] | null;
    site_analysis: { possui_site: boolean } | null; company: { name: string; city: string } | null;
  } | null;

  const { data: historico } = await admin.from("prostec_mensagens").select("remetente, conteudo").eq("conversa_id", conversa.id).order("enviada_em", { ascending: false }).limit(20);

  const resultadoDecisao = await decidirProximaAcao({
    empresa: lead?.company?.name ?? "essa empresa",
    segmento: lead?.segment ?? "não informado",
    cidade: lead?.company?.city ?? "não informada",
    score: lead?.score ?? 0,
    temperatura: lead?.temperature ?? "frio",
    possuiSite: lead?.site_analysis?.possui_site ?? false,
    motivoOportunidade: lead?.reasons?.[0] ?? "presença digital com espaço pra melhorar",
    etapaAtual: lead?.status ?? "novo",
    resumoContexto: conversa.resumo_contexto,
    historico: (historico ?? []).reverse(),
    mensagemNova: textoRecebido,
  });

  if (!resultadoDecisao) {
    // IA falhou — nunca decide sozinha, escala.
    await admin.from("prostec_conversas").update({ exige_atencao: true, motivo_atencao: "Iara não conseguiu processar essa mensagem — verificar manualmente" }).eq("id", conversa.id);
    await verificarCircuitBreakerErroIA(admin);
    return;
  }

  const { decisao, tokensEntrada, tokensSaida, modelo } = resultadoDecisao;
  const custoEstimado = estimarCustoIara(modelo, tokensEntrada, tokensSaida);

  await admin.from("prostec_ia_decisoes").insert({
    conversa_id: conversa.id, mensagem_recebida: textoRecebido, intent: decisao.intent,
    decisao: decisao.proxima_acao, acao: decisao.gerar_proposta ? "gerar_proposta" : "responder",
    tokens_entrada: tokensEntrada ?? null, tokens_saida: tokensSaida ?? null, custo_estimado: custoEstimado,
    desconto_solicitado_pct: decisao.desconto_oferecido_pct || null,
    desconto_validado: decisao.desconto_oferecido_pct > 0 ? !decisao.pedido_fora_limite : null,
  });

  // Atualiza CRM conforme a decisão — nunca sozinha em status fora da lista permitida.
  if (lead?.id) {
    const patch: Record<string, unknown> = {};
    if (decisao.novo_status_lead && STATUS_VALIDOS.includes(decisao.novo_status_lead)) {
      patch.status = decisao.novo_status_lead;
      if (decisao.novo_status_lead === "perdido") patch.motivo_perda = decisao.motivo_perda;
    }
    if (decisao.nova_temperatura) patch.temperature = decisao.nova_temperatura;
    if (decisao.produto_interesse) patch.produto_interesse = decisao.produto_interesse;
    if (Object.keys(patch).length > 0) await admin.from("prostec_leads").update(patch).eq("id", lead.id);

    if (patch.status === "qualificado") {
      const { distribuirLeadAutomaticamente } = await import("../prostec.actions");
      await distribuirLeadAutomaticamente(lead.id);
    }
  }

  const novasObjecoes = decisao.objecao ? [...(Array.isArray(conversa.objecoes) ? conversa.objecoes : []), decisao.objecao] : conversa.objecoes;
  await admin.from("prostec_conversas").update({
    ultima_intencao: decisao.intent, proxima_acao: decisao.proxima_acao, objecoes: novasObjecoes,
    exige_atencao: decisao.exige_atencao_humana || decisao.pedido_fora_limite,
    motivo_atencao: decisao.motivo_atencao ?? (decisao.pedido_fora_limite ? "Cliente pediu condição fora do limite configurado" : null),
    nao_contatar: decisao.nao_contatar,
    propriedade: decisao.exige_atencao_humana || decisao.pedido_fora_limite ? "paused" : conversa.propriedade,
  }).eq("id", conversa.id);

  if (decisao.nao_contatar) {
    // Registro GLOBAL por telefone — nunca mais entra em campanha
    // nenhuma, não só essa conversa. Pedido explícito: opt-out precisa
    // bloquear reentrada de verdade.
    await admin.from("prostec_opt_out").upsert({ telefone, motivo: "Cliente pediu pra não receber mais mensagens", origem: "cliente_solicitou" }, { onConflict: "telefone" });
  }

  // Só manda a resposta se não precisar escalar pro humano ANTES de falar (evita a Iara prometer algo indevido).
  if (!decisao.pedido_fora_limite) {
    if (!(await podeEnviarMensagemReal())) {
      await registrarMensagem(conversa.id, "bot", `[MODO TESTE — não enviado de verdade] ${decisao.resposta}`, true);
    } else {
      const resultadoEnvio = await enviarMensagemProstec(telefone, decisao.resposta);
      if (resultadoEnvio.enviado) await registrarMensagem(conversa.id, "bot", decisao.resposta, true);
    }
  }

  if (decisao.gerar_proposta && lead?.id) {
    // Gera a proposta do produto que a conversa estava focada; se por
    // algum motivo a IA não deixou isso claro, cai pro primeiro produto
    // ativo do catálogo (nunca trava sem gerar nada).
    const { data: produtosData } = await admin.from("prostec_produtos").select("*").eq("ativo", true).order("ordem", { ascending: true });
    const produtosAtivos = produtosData && produtosData.length > 0 ? (produtosData as ProdutoProstecDados[]) : PRODUTOS_PROSTEC_PADRAO;
    const produtoDaProposta = produtosAtivos.find((p) => p.id === decisao.produto_interesse) ?? produtosAtivos[0] ?? null;
    if (produtoDaProposta) {
      const { data: proposta } = await admin.from("prostec_propostas").insert({
        lead_id: lead.id, produto: produtoDaProposta.nome, valor: produtoDaProposta.preco, forma_pagamento: produtoDaProposta.formas_pagamento,
        valor_manutencao_mensal: produtoDaProposta.valor_manutencao_mensal > 0 ? produtoDaProposta.valor_manutencao_mensal : null,
      }).select("token_publico").single();

      if (proposta) {
        const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://neotecbrasil.com"}/proposta/${proposta.token_publico}`;
        const textoProposta = `Aqui está a proposta, é só abrir o link: ${link}`;
        const envio = await enviarMensagemProstec(telefone, textoProposta);
        if (envio.enviado) await registrarMensagem(conversa.id, "bot", textoProposta, true);
        await admin.from("prostec_leads").update({ status: "proposta_enviada" }).eq("id", lead.id);
        await admin.from("prostec_atividades").insert({ lead_id: lead.id, tipo: "proposta_enviada", descricao: "📄 Iara enviou proposta automaticamente" });
      }
    }
  }
}

/** Vendedor assume a conversa manualmente — a qualquer momento. */
export async function assumirConversaProstec(conversaId: string, usuarioId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("prostec_conversas").update({ propriedade: "human", responsavel_id: usuarioId, status: "aberta", exige_atencao: false }).eq("id", conversaId);
}

/** Devolve a conversa pra Iara — ela retoma de onde parou. */
export async function devolverConversaParaIara(conversaId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("prostec_conversas").update({ propriedade: "ai", responsavel_id: null, exige_atencao: false, motivo_atencao: null }).eq("id", conversaId);
}
