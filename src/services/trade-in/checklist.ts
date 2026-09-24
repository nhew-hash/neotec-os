/**
 * Roteiro de avaliação de troca — reaproveita os itens que já existiam
 * nos dois checklists do sistema (qualidade de estoque: Face ID, câmeras,
 * tela, som, microfone, Wi-Fi, Bluetooth, carregamento; recebimento de
 * assistência: molhado, arranhado, botões, biometria) e adiciona só o
 * que faltava pra decidir um VALOR de troca (bateria em %, peças
 * substituídas, IMEI/iCloud como bloqueio).
 *
 * Cada item liga a resposta REPROVADA a um ou mais códigos de
 * `troca_avarias` (Fase 236) — é assim que o checklist alimenta o motor
 * sem precisar duplicar a lista de avarias em dois lugares.
 */

export interface ChecklistItemTradeIn {
  id: string;
  titulo: string;
  como: string;
  /** Códigos de avaria (troca_avarias.codigo) marcados automaticamente quando a resposta é reprovada. */
  avariasSeReprovado: string[];
  /** Item de segurança — reprovar aqui deveria levar a equipe a considerar recusar o trade-in. */
  alerta?: string;
}

export interface GrupoChecklistTradeIn {
  grupo: string;
  itens: ChecklistItemTradeIn[];
}

export const CHECKLIST_TRADE_IN: GrupoChecklistTradeIn[] = [
  {
    grupo: "Inspeção visual",
    itens: [
      { id: "tela_estado", titulo: "Tela sem trincas, manchas ou linhas", como: "Frente contra a luz; fundo branco e preto no brilho máximo.", avariasSeReprovado: ["tela"] },
      { id: "riscos_carcaca", titulo: "Sem riscos ou amassados visíveis", como: "Carcaça, laterais e traseira.", avariasSeReprovado: ["marcas_leves", "marcas_moderadas"] },
      { id: "sinais_abertura", titulo: "Sem sinais de abertura", como: "Parafusos da base e lacres internos.", avariasSeReprovado: ["aberto"] },
      { id: "sinais_liquido", titulo: "Sem sinais de líquido", como: "Indicador de líquido (compartimento do chip ou porta de carga).", avariasSeReprovado: ["liquido"], alerta: "Indicador acionado normalmente bloqueia o trade-in." },
    ],
  },
  {
    grupo: "Touch e funcionamento",
    itens: [
      { id: "touch", titulo: "Touch funciona em toda a área da tela", como: "Arrastar um ícone pelos 4 cantos.", avariasSeReprovado: ["tela"] },
      { id: "face_id", titulo: "Face ID / Touch ID funciona", como: "Cadastrar de novo e desbloquear.", avariasSeReprovado: ["face_id"] },
      { id: "botoes", titulo: "Botões físicos respondem bem", como: "Volume, power, silencioso/Ação.", avariasSeReprovado: ["botoes"] },
      { id: "vibracao", titulo: "Vibração funciona", como: "Silenciar o aparelho e testar uma ligação.", avariasSeReprovado: ["vibracao"] },
      { id: "sensores", titulo: "Sensores de proximidade/rotação OK", como: "Tela apaga durante ligação; rotação de tela funciona.", avariasSeReprovado: ["sensores"] },
    ],
  },
  {
    grupo: "Câmeras e áudio",
    itens: [
      { id: "camera_traseira", titulo: "Câmera traseira OK", como: "Foco, todas as lentes, foto e vídeo com áudio.", avariasSeReprovado: ["camera_traseira"] },
      { id: "camera_frontal", titulo: "Câmera frontal OK", como: "Selfie e vídeo.", avariasSeReprovado: ["camera_frontal"] },
      { id: "audio", titulo: "Alto-falante e microfone OK", como: "Viva-voz, música e gravação de áudio.", avariasSeReprovado: ["alto_falante_microfone"] },
    ],
  },
  {
    grupo: "Conectividade e carga",
    itens: [
      { id: "carga", titulo: "Carrega normalmente", como: "Cabo original, nas duas posições se aplicável.", avariasSeReprovado: ["doc_carga"] },
      { id: "wifi_bluetooth", titulo: "Wi-Fi e Bluetooth conectam", como: "Conecta a uma rede e pareia um dispositivo.", avariasSeReprovado: ["wifi_bluetooth"] },
    ],
  },
  {
    grupo: "Peças e histórico",
    itens: [
      { id: "notif_peca", titulo: "Sem notificação de peça não original", como: "Ajustes > Geral > Sobre (iOS) ou equivalente Android.", avariasSeReprovado: ["notif_peca"] },
      { id: "pecas_substituidas", titulo: "Nenhuma peça visivelmente substituída", como: "Compare acabamento com o padrão de fábrica do modelo.", avariasSeReprovado: ["pecas_substituidas"] },
    ],
  },
  {
    grupo: "Segurança",
    itens: [
      { id: "icloud_conta", titulo: "Conta iCloud/Google removida", como: "Nenhuma conta logada ao finalizar a avaliação.", avariasSeReprovado: ["icloud_conta"], alerta: "Nunca aceitar com conta de terceiro ativa." },
      { id: "imei_ok", titulo: "IMEI confere e sem restrição", como: "*#06# (ou Ajustes) e consulta de restrição/roubo-furto.", avariasSeReprovado: ["imei_bloqueado"], alerta: "IMEI divergente ou com restrição: recomendado recusar." },
    ],
  },
];

export const CHECKLIST_TRADE_IN_TOTAL = CHECKLIST_TRADE_IN.reduce((soma, grupo) => soma + grupo.itens.length, 0);

export interface OpcaoTampaTraseira {
  id: string;
  titulo: string;
  /** Código de `troca_avarias` marcado quando esta opção é escolhida — `null` = "Sem danos", nenhuma avaria. */
  avariaCodigo: string | null;
}

/**
 * Fase 250 — critério próprio pra "estado da tampa traseira", separado
 * do item genérico `riscos_carcaca` (que continua cobrindo carcaça e
 * laterais). É seleção única (as 4 opções são mutuamente excludentes —
 * um aparelho só está em UM desses estados), diferente do resto do
 * checklist (que é OK/Reprovado por item). Os códigos já existem no
 * catálogo de avarias (Fase 250: `traseira_marcas_leves`/`_fortes`;
 * Fase 239: `traseira` = quebrada) — nenhuma mudança no motor foi
 * necessária, ele já soma qualquer avaria marcada genericamente.
 */
export const OPCOES_TAMPA_TRASEIRA: OpcaoTampaTraseira[] = [
  { id: "sem_danos", titulo: "Sem danos", avariaCodigo: null },
  { id: "marcas_leves", titulo: "Marcas leves", avariaCodigo: "traseira_marcas_leves" },
  { id: "marcas_fortes", titulo: "Marcas fortes", avariaCodigo: "traseira_marcas_fortes" },
  { id: "quebrada", titulo: "Quebrada", avariaCodigo: "traseira" },
];

/** Converte respostas do checklist ({itemId: 'ok'|'reprovado'}) na lista de códigos de avaria a marcar no motor. */
export function avariasDoChecklist(respostas: Record<string, "ok" | "reprovado">): string[] {
  const codigos = new Set<string>();
  for (const grupo of CHECKLIST_TRADE_IN) {
    for (const item of grupo.itens) {
      if (respostas[item.id] === "reprovado") {
        for (const codigo of item.avariasSeReprovado) codigos.add(codigo);
      }
    }
  }
  return [...codigos];
}
