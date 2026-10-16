"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  obterChavePublicaAction, removerInscricaoAction, salvarInscricaoAction, salvarPreferenciasAction,
  statusInscricaoAction, testarNotificacaoAction,
} from "@/services/celular/celular.actions";
import type { PreferenciasPush } from "@/services/push/push";
import { appInstalado, ehIOS, inscrever, inscricaoAtual, serializar, suportePush, type SuportePush } from "./push-cliente";

type Estado = { carregando: true } | { carregando: false; suporte: SuportePush; endpoint: string | null; ativa: boolean; preferencias: PreferenciasPush };

const ROTULOS: { chave: keyof PreferenciasPush; texto: string; detalhe: string }[] = [
  { chave: "mensagens", texto: "Mensagens de clientes", detalhe: "Das suas conversas; sem responsável, avisa a equipe." },
  { chave: "retornos", texto: "Retornos do CRM", detalhe: "Quando chega a hora do retorno que você agendou." },
  { chave: "aprovacoes", texto: "Aprovações", detalhe: "Pedido de desconto (gerência) e a resposta (vendedora)." },
];

/**
 * "Ativar notificações neste aparelho": cada celular/computador se inscreve
 * separado. No iPhone só funciona com o app na Tela de Início.
 */
export function AtivarNotificacoes() {
  const [estado, setEstado] = useState<Estado>({ carregando: true });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  async function recarregar() {
    const suporte = suportePush();
    const sub = suporte.ok ? await inscricaoAtual() : null;
    if (!sub) return setEstado({ carregando: false, suporte, endpoint: null, ativa: false, preferencias: { mensagens: true, retornos: true, aprovacoes: true } });
    const r = await statusInscricaoAction(sub.endpoint);
    if (!r.success) { setErro(r.error); return setEstado({ carregando: false, suporte, endpoint: sub.endpoint, ativa: false, preferencias: { mensagens: true, retornos: true, aprovacoes: true } }); }
    setEstado({ carregando: false, suporte, endpoint: sub.endpoint, ativa: r.data.ativa, preferencias: r.data.preferencias });
  }

  useEffect(() => {
    recarregar().catch((err) => { setErro(err instanceof Error ? err.message : "Não foi possível ler as notificações."); setEstado({ carregando: false, suporte: suportePush(), endpoint: null, ativa: false, preferencias: { mensagens: true, retornos: true, aprovacoes: true } }); });
  }, []);

  function ativar() {
    setErro(null); setOk(null);
    start(async () => {
      try {
        const chave = await obterChavePublicaAction();
        if (!chave.success) return setErro(chave.error);
        const sub = await inscrever(chave.data);
        const r = await salvarInscricaoAction(serializar(sub));
        if (!r.success) return setErro(r.error);
        await recarregar();
        setOk("Notificações ativadas neste aparelho. Toque em “Testar” para conferir.");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível ativar.");
      }
    });
  }

  function desativar() {
    setErro(null); setOk(null);
    start(async () => {
      try {
        const sub = await inscricaoAtual();
        if (sub) {
          const r = await removerInscricaoAction(sub.endpoint);
          if (!r.success) return setErro(r.error);
          await sub.unsubscribe();
        }
        await recarregar();
        setOk("Notificações desativadas neste aparelho.");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível desativar.");
      }
    });
  }

  function testar() {
    setErro(null); setOk(null);
    start(async () => {
      const r = await testarNotificacaoAction();
      if (!r.success) return setErro(r.error);
      setOk(`Teste enviado para ${r.data.enviados} ${r.data.enviados === 1 ? "aparelho" : "aparelhos"}. Deve aparecer em instantes.`);
    });
  }

  function alternar(chave: keyof PreferenciasPush, valor: boolean) {
    if (estado.carregando || !estado.endpoint) return;
    const novas = { ...estado.preferencias, [chave]: valor };
    setEstado({ ...estado, preferencias: novas });
    start(async () => {
      const r = await salvarPreferenciasAction(estado.endpoint!, novas);
      if (!r.success) { setErro(r.error); await recarregar(); }
    });
  }

  if (estado.carregando) return <p role="status" className="text-sm text-muted-foreground">Verificando este aparelho…</p>;

  if (!estado.suporte.ok && estado.suporte.motivo === "ios_instalar") {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium">No iPhone, primeiro coloque o app na Tela de Início:</p>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Abra este endereço no <strong className="text-foreground">Safari</strong>.</li>
          <li>Toque em <Share className="inline h-4 w-4 align-text-bottom" aria-label="Compartilhar" /> <strong className="text-foreground">Compartilhar</strong>.</li>
          <li>Escolha <SquarePlus className="inline h-4 w-4 align-text-bottom" aria-hidden /> <strong className="text-foreground">Adicionar à Tela de Início</strong>.</li>
          <li>Abra o <strong className="text-foreground">Neotec OS</strong> pelo ícone e volte nesta tela para ativar.</li>
        </ol>
        <p className="text-xs text-muted-foreground">Precisa do iOS 16.4 ou mais novo.</p>
      </div>
    );
  }
  if (!estado.suporte.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        {estado.suporte.motivo === "bloqueado"
          ? "As notificações estão bloqueadas para este site. Libere em Configurações do navegador → Notificações → neotecbrasil.com e volte aqui."
          : "Este navegador não recebe notificações. No Android use o Chrome; no iPhone, o app instalado pelo Safari."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {estado.ativa ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-success-text"><Bell className="h-4 w-4" aria-hidden />Ativas neste aparelho</p>
          <ul className="space-y-2">
            {ROTULOS.map((r) => (
              <li key={r.chave}>
                <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Checkbox checked={estado.preferencias[r.chave]} onCheckedChange={(v) => alternar(r.chave, v === true)} disabled={pendente} className="mt-0.5" />
                  <span><span className="block text-sm font-medium">{r.texto}</span><span className="block text-xs text-muted-foreground">{r.detalhe}</span></span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Pedidos de foto/IMEI que você faz no computador sempre chegam. Clientes que pediram para não ser contatados nunca geram aviso.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={testar} disabled={pendente}>Testar</Button>
            <Button type="button" variant="ghost" onClick={desativar} disabled={pendente}><BellOff className="h-4 w-4" />Desativar</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Receba aviso de mensagem nova, retorno e aprovação mesmo com o app fechado.{!appInstalado() && !ehIOS() ? " Dica: instale o app (menu ⋮ → Instalar app) para abrir direto pelo ícone." : ""}</p>
          <Button type="button" onClick={ativar} disabled={pendente}><Bell className="h-4 w-4" />{pendente ? "Ativando…" : "Ativar notificações neste aparelho"}</Button>
        </>
      )}
      {erro && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      {ok && <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">{ok}</p>}
    </div>
  );
}
