import type { ResultadoEnvioWhatsapp } from "../whatsapp.types";
import type { IntegracaoWhatsapp } from "@/types";

/**
 * Contrato único que TODO provedor de WhatsApp precisa cumprir. O resto
 * do sistema (CRM, automação, atendimento, OS) conversa só com isso —
 * nunca importa nada específico da Meta ou do WhatsApp Web diretamente.
 * Adicionar um terceiro provedor no futuro significa implementar esta
 * interface de novo, sem tocar em mais nada.
 */
export interface WhatsappProvider {
  /** Nome do provedor, pra log e exibição. */
  readonly nome: string;

  /**
   * Envia uma mensagem de texto simples. `jidDireto`, quando presente,
   * é o identificador exato de resposta que o provedor deu na última
   * mensagem recebida (relevante só pro WhatsApp Web — contas migradas
   * pra "LID" às vezes não têm telefone real disponível, mas dá pra
   * responder direto pro identificador mesmo assim). A Meta Cloud API
   * ignora esse parâmetro, sempre usa o telefone.
   */
  enviarTexto(telefone: string, texto: string, jidDireto?: string): Promise<ResultadoEnvioWhatsapp>;

  /**
   * Envia um template pré-aprovado. Só a Meta Cloud API tem esse
   * conceito de verdade (janela de 24h) — o WhatsApp Web ignora e envia
   * como texto simples, porque não tem essa restrição.
   */
  enviarTemplate(
    telefone: string,
    nomeTemplate: string,
    idioma: string,
    variaveis: string[]
  ): Promise<ResultadoEnvioWhatsapp>;

  /** Estado atual da conexão — usado pro card do Dashboard e a tela de Configurações. */
  obterStatus(): Promise<Pick<IntegracaoWhatsapp, "status" | "numero" | "ultima_conexao" | "mensagens_hoje">>;
}
