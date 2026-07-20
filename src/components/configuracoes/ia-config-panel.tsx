"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { salvarConfiguracaoIAAction, testarConexaoIAAction } from "@/services/ia/ia.actions";
import { formatDateTime } from "@/utils";
import type { ConfiguracaoIA, IAProviderTipo } from "@/types";
import type { EstatisticasUsoIA } from "@/services/ia/ia-estatisticas.service";

const MODELOS_POR_PROVIDER: Record<IAProviderTipo, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini (rápido e barato)" },
    { value: "gpt-4o", label: "GPT-4o (mais capaz)" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-5", label: "Claude Sonnet (equilibrado)" },
    { value: "claude-haiku-4-5", label: "Claude Haiku (rápido e barato)" },
  ],
  gemini: [{ value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (em breve)" }],
  local: [{ value: "local", label: "Modelo local (em breve)" }],
};

const PROVIDER_LABEL: Record<IAProviderTipo, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  local: "Modelo local",
};

interface IAConfigPanelProps {
  configuracao: ConfiguracaoIA;
  chaves: Record<"openai" | "anthropic" | "gemini", boolean>;
  estatisticas: EstatisticasUsoIA;
}

export function IAConfigPanel({ configuracao, chaves, estatisticas }: IAConfigPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTestando, startTesteTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [provider, setProvider] = useState<IAProviderTipo>(configuracao.provider);
  const [testeResultado, setTesteResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    setSucesso(null);
    startTransition(async () => {
      const result = await salvarConfiguracaoIAAction(formData);
      if (!result.success) return setErro(result.error);
      setSucesso("Configuração salva.");
      router.refresh();
    });
  }

  function handleTestar() {
    setTesteResultado(null);
    startTesteTransition(async () => {
      const result = await testarConexaoIAAction();
      setTesteResultado(
        result.success ? { ok: true, mensagem: result.data.resposta } : { ok: false, mensagem: result.error }
      );
    });
  }

  const chaveProviderAtual = provider === "openai" || provider === "anthropic" || provider === "gemini" ? chaves[provider] : false;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Provedor e modelo</CardTitle></CardHeader>
        <CardContent>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Provedor de IA</Label>
              <Select name="provider" value={provider} onValueChange={(v) => setProvider(v as IAProviderTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROVIDER_LABEL) as IAProviderTipo[]).map((p) => (
                    <SelectItem key={p} value={p}>{PROVIDER_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(provider === "openai" || provider === "anthropic" || provider === "gemini") && (
                <div className="flex items-center gap-1.5 text-xs">
                  {chaveProviderAtual ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-success" /><span className="text-success">Chave de API configurada</span></>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 text-danger" /><span className="text-danger">Chave de API não configurada no ambiente</span></>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Modelo</Label>
              <Select name="modelo" defaultValue={configuracao.modelo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELOS_POR_PROVIDER[provider].map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ativo" defaultChecked={configuracao.ativo} className="h-4 w-4 accent-primary" />
              IA ativa
            </label>

            <label className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm">
              <input
                type="checkbox" name="atendimento_automatico_ativo"
                defaultChecked={configuracao.atendimento_automatico_ativo}
                className="h-4 w-4 accent-warning"
              />
              <span className="flex flex-col">
                <span className="font-medium text-foreground">Atendimento automático (responde cliente sozinha)</span>
                <span className="text-xs text-muted-foreground">
                  Separado do "IA ativa" acima — pode ligar a IA só pra Cotações sem deixar ela falar com cliente ainda.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Temperatura (0 a 2)</Label>
                <Input name="temperatura" type="number" step="0.1" min="0" max="2" defaultValue={configuracao.temperatura} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Limite de tokens</Label>
                <Input name="limite_tokens" type="number" min="100" max="32000" defaultValue={configuracao.limite_tokens} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Prompt do sistema (opcional)</Label>
              <Textarea
                name="prompt_sistema"
                placeholder="Instrução geral de comportamento — cada módulo pode sobrescrever isso pra sua tarefa específica."
                defaultValue={configuracao.prompt_sistema ?? ""}
                rows={4}
              />
            </div>

            {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
            {sucesso && <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">{sucesso}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleTestar} disabled={isTestando}>
                <Sparkles className="h-4 w-4" />
                {isTestando ? "Testando..." : "Testar conexão"}
              </Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
            </div>

            {testeResultado && (
              <p className={`rounded-md px-3 py-2 text-sm ${testeResultado.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                {testeResultado.mensagem}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Consumo estimado (últimos 30 dias)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Chamadas</span>
            <span className="font-display text-lg font-semibold text-foreground">{estatisticas.chamadasUltimos30Dias}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Tokens (entrada + saída)</span>
            <span className="font-display text-lg font-semibold text-foreground">
              {(estatisticas.tokensEntradaTotal + estatisticas.tokensSaidaTotal).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Custo estimado</span>
            <span className="font-display text-lg font-semibold text-foreground">US$ {estatisticas.custoEstimadoTotal.toFixed(4)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Taxa de sucesso</span>
            <StatusBadge
              label={`${estatisticas.taxaSucesso.toFixed(0)}%`}
              tone={estatisticas.taxaSucesso >= 95 ? "success" : estatisticas.taxaSucesso >= 80 ? "warning" : "danger"}
            />
          </div>
          {estatisticas.ultimaChamada && (
            <p className="col-span-full text-xs text-muted-foreground">Última chamada: {formatDateTime(estatisticas.ultimaChamada)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
