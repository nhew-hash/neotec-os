/**
 * Tipos do módulo NeoLoc (locação de iPhones + MDM).
 *
 * Mantidos num arquivo próprio (em vez de somar em `database.ts`) porque
 * o NeoLoc é um módulo novo e ainda em Milestone 2 (camada de negócio,
 * sem integração real com NanoMDM) — ver ARCHITECTURE.md.
 */

export type StatusMdmDispositivo = "nao_matriculado" | "pendente_matricula" | "matriculado" | "removido" | "erro_matricula";
export type ActivationLockStatus = "desconhecido" | "ativo" | "inativo";
export type MetodoEnrollment = "automated_device_enrollment" | "apple_configurator" | "manual";

export type TipoComandoNeoLoc = "bloquear" | "desbloquear" | "reiniciar" | "modo_perdido" | "apagar" | "atualizar_informacoes" | "remover_mdm";
export type OrigemComandoNeoLoc = "manual" | "automatico_inadimplencia" | "automatico_quitacao";
export type StatusComandoNeoLoc = "pending" | "sent" | "acknowledged" | "success" | "failed" | "expired";

export interface NeolocDispositivo {
  id: string;
  loja_id: string;
  aparelho_id: string;
  contrato_id: string | null;
  cliente_id: string | null;
  udid: string | null;
  imei2: string | null;
  ios_versao: string | null;
  status_mdm: StatusMdmDispositivo;
  supervisionado: boolean | null;
  activation_lock: ActivationLockStatus;
  ultimo_checkin: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NeolocComando {
  id: string;
  command_id: string;
  dispositivo_id: string;
  tipo: TipoComandoNeoLoc;
  origem: OrigemComandoNeoLoc;
  usuario_id: string | null;
  motivo: string | null;
  contrato_id: string | null;
  status: StatusComandoNeoLoc;
  resultado: string | null;
  erro: string | null;
  tentativas: number;
  created_at: string;
  updated_at: string;
}

export interface NeolocConfiguracao {
  id: string;
  loja_id: string;
  dias_cobranca: number;
  dias_recolhimento: number;
  liberacao_automatica_quitacao: boolean;
  campos_visiveis: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

/** Visão combinada dispositivo + contrato + cliente + estado do Crediário, pra lista e painel. */
export interface NeolocDispositivoResumo {
  id: string;
  status_mdm: StatusMdmDispositivo;
  ultimo_checkin: string | null;
  aparelho: { id: string; imei: string; numero_serie: string | null; cor: string | null; produto_nome: string | null } | null;
  cliente_nome: string | null;
  contrato_numero: string | null;
  contrato_status: string | null;
  status_crediario: string | null;
  dias_atraso: number;
}
