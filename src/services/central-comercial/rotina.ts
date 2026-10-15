/**
 * "O que preciso fazer agora?" — escolhe UMA próxima ação a partir do que a tela já carregou.
 * Função pura: sem banco, sem relógio. Prioridade fixa e explicável:
 * cliente esperando > orçamento parado > follow-up sugerido > tarefa atrasada > tarefa pendente.
 */
export interface EntradaRotina {
  clientesAguardando: { nome: string; naoLidas: number; conversaId: string }[];
  orcamentosParados: { cliente: string | null; dias: number }[];
  sugestoesPendentes: number;
  tarefasAtrasadas: number;
  tarefasPendentes: number;
}

export interface ProximaAcao {
  tipo: "responder" | "orcamento_parado" | "follow_up" | "tarefa_atrasada" | "tarefa" | "em_dia";
  titulo: string;
  detalhe: string;
  rotulo: string;
  href: string;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function proximaAcao(e: EntradaRotina): ProximaAcao {
  if (e.clientesAguardando.length > 0) {
    const primeiro = e.clientesAguardando[0];
    const outros = e.clientesAguardando.length - 1;
    return {
      tipo: "responder",
      titulo: `${primeiro.nome} está esperando resposta`,
      detalhe: outros > 0 ? `Mais ${plural(outros, "cliente", "clientes")} na fila depois dele.` : `${plural(primeiro.naoLidas, "mensagem nova", "mensagens novas")}.`,
      rotulo: "Responder agora",
      href: `/comunicacao/${primeiro.conversaId}`,
    };
  }
  const parados = e.orcamentosParados.filter((o) => o.dias >= 3).sort((a, b) => b.dias - a.dias);
  if (parados.length > 0) {
    const p = parados[0];
    return {
      tipo: "orcamento_parado",
      titulo: `Proposta de ${p.cliente ?? "cliente"} parada há ${plural(p.dias, "dia", "dias")}`,
      detalhe: parados.length > 1 ? `Há ${plural(parados.length, "proposta parada", "propostas paradas")} no total.` : "Vale retomar a conversa antes que esfrie.",
      rotulo: "Ver propostas",
      href: "/central-comercial/propostas",
    };
  }
  if (e.sugestoesPendentes > 0) {
    return { tipo: "follow_up", titulo: `${plural(e.sugestoesPendentes, "follow-up sugerido", "follow-ups sugeridos")}`, detalhe: "Revise o texto, ajuste se quiser e envie. Nada sai sozinho.", rotulo: "Ver sugestões", href: "#follow-ups" };
  }
  if (e.tarefasAtrasadas > 0) {
    return { tipo: "tarefa_atrasada", titulo: `${plural(e.tarefasAtrasadas, "tarefa atrasada", "tarefas atrasadas")}`, detalhe: "Conclua ou registre uma observação.", rotulo: "Ver tarefas", href: "#tarefas" };
  }
  if (e.tarefasPendentes > 0) {
    return { tipo: "tarefa", titulo: `${plural(e.tarefasPendentes, "tarefa para hoje", "tarefas para hoje")}`, detalhe: "Dentro do prazo.", rotulo: "Ver tarefas", href: "#tarefas" };
  }
  return { tipo: "em_dia", titulo: "Tudo em dia por aqui", detalhe: "Nenhum cliente esperando e nenhuma proposta parada. Que tal começar uma proposta nova?", rotulo: "Nova proposta", href: "/central-comercial/proposta" };
}
