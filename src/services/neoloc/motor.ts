/**
 * Motor de decisão do NeoLoc — puro, sem I/O, fácil de testar.
 *
 * NÃO reimplementa a régua de cobrança (isso já existe e continua sendo
 * feito por `crediario.service.ts#executarReguaCobranca`, que manda
 * WhatsApp e marca `crediario_parcelas.status = 'atrasado'`). Este motor
 * só decide, a partir do estado que o Crediário já calculou, se chegou a
 * hora de gerar um COMANDO de MDM — e qual.
 *
 * Importante (item 28 do prompt do NeoLoc): contrato, dispositivo e
 * comando são três estados diferentes. Este motor só decide a intenção
 * (`deveGerarComando`); o envio de verdade e a confirmação do resultado
 * são responsabilidade da fila de comandos (`neoloc.actions.ts`), que
 * ainda depende da integração real com NanoMDM (Milestone 1/3).
 */

export interface EstadoParaDecisao {
  diasAtraso: number;
  statusMdmAtual: "nao_matriculado" | "pendente_matricula" | "matriculado" | "removido" | "erro_matricula";
  existeComandoDeBloqueioPendenteOuRecente: boolean;
  contratoQuitado: boolean;
  liberacaoAutomaticaQuitacao: boolean;
}

export interface ConfiguracaoNeoLoc {
  diasCobranca: number;
  diasRecolhimento: number;
}

export type DecisaoNeoLoc =
  | { tipo: "nenhuma" }
  | { tipo: "bloquear"; motivo: string }
  | { tipo: "desbloquear"; motivo: string }
  | { tipo: "remover_mdm"; motivo: string };

/**
 * Decide se deve gerar um comando automático, dado o estado atual do
 * contrato/dispositivo e a configuração de dias da loja.
 *
 * Regras:
 * - Dispositivo precisa estar matriculado pra qualquer comando fazer sentido.
 * - Bloqueia quando os dias de atraso ultrapassam `diasCobranca` (a régua
 *   de cobrança do Crediário já rodou o período de avisos antes disso) —
 *   e só se ainda não existir um comando de bloqueio pendente/recente
 *   (evita duplicar comando a cada execução do cron).
 * - Desbloqueia assim que o atraso zera (pagamento confirmado) e o
 *   dispositivo está matriculado — não temos como saber aqui que ele
 *   estava bloqueado, então quem chama decide se o desbloqueio é
 *   necessário (idempotência fica a cargo da fila de comandos).
 * - Ao quitar o contrato, só remove o MDM automaticamente se a loja
 *   configurou liberação automática; por padrão (item 16 do prompt),
 *   fica pendente de confirmação do administrador — não decidido aqui.
 */
export function decidirAcaoAutomatica(estado: EstadoParaDecisao, config: ConfiguracaoNeoLoc): DecisaoNeoLoc {
  if (estado.statusMdmAtual !== "matriculado") return { tipo: "nenhuma" };

  if (estado.contratoQuitado) {
    if (estado.liberacaoAutomaticaQuitacao) {
      return { tipo: "remover_mdm", motivo: "Contrato quitado — liberação automática configurada pela loja." };
    }
    return { tipo: "nenhuma" }; // aguarda confirmação manual do administrador (padrão).
  }

  if (estado.diasAtraso > config.diasCobranca && !estado.existeComandoDeBloqueioPendenteOuRecente) {
    return { tipo: "bloquear", motivo: `Inadimplência além do limite configurado (${config.diasCobranca} dia(s) de cobrança, atraso atual de ${estado.diasAtraso} dia(s)).` };
  }

  if (estado.diasAtraso === 0 && estado.existeComandoDeBloqueioPendenteOuRecente) {
    return { tipo: "desbloquear", motivo: "Pagamento confirmado — atraso zerado." };
  }

  return { tipo: "nenhuma" };
}

/** Gera um `command_id` idempotente e legível — mesmo par (dispositivo, tipo, dia) nunca duplica comando por retry. */
export function gerarCommandId(dispositivoId: string, tipo: string, data: Date = new Date()): string {
  const dia = data.toISOString().slice(0, 10);
  return `${tipo}_${dispositivoId}_${dia}`;
}
