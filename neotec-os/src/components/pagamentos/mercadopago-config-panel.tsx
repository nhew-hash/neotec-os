"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wifi, WifiOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { atualizarConfiguracaoGatewayAction, testarConexaoGatewayAction } from "@/services/pagamentos/gateway-config.actions";
import { formatDateTime } from "@/utils";
import type { ConfiguracaoGatewayPagamento } from "@/types";

export function MercadoPagoConfigPanel({ config }: { config: ConfiguracaoGatewayPagamento }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [testando, setTestando] = useState(false);
  const [publicKey, setPublicKey] = useState(config.public_key ?? "");
  const [accessToken, setAccessToken] = useState(config.access_token ?? "");
  const [webhookSecret, setWebhookSecret] = useState(config.webhook_secret ?? "");
  const [modo, setModo] = useState(config.modo);
  const [ativo, setAtivo] = useState(config.ativo);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const result = await atualizarConfiguracaoGatewayAction("mercadopago", { public_key: publicKey, access_token: accessToken, webhook_secret: webhookSecret, modo, ativo });
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  async function testarConexao() {
    setErro(null);
    setTestando(true);
    const result = await testarConexaoGatewayAction("mercadopago");
    setTestando(false);
    if (!result.success) return setErro(result.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mercado Pago</CardTitle>
          <Badge variant={config.ultimo_teste_conexao_sucesso ? "success" : "secondary"}>
            {config.ultimo_teste_conexao_sucesso ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {config.ultimo_teste_conexao_sucesso ? "Conectado" : "Não testado"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Public Key</label>
            <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="APP_USR-..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Access Token</label>
            <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="APP_USR-..." />
            <p className="text-[11px] text-muted-foreground">Fica salvo só no banco, nunca é exposto pro navegador do cliente.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Webhook Secret</label>
            <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="Opcional — validação extra de assinatura" />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={modo === "sandbox"} onChange={() => setModo("sandbox")} className="accent-primary" />Sandbox (teste)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={modo === "producao"} onChange={() => setModo("producao")} className="accent-primary" />Produção
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 accent-primary" />
            Pagamento online ativo na loja
          </label>

          {erro && <p className="text-xs text-danger">{erro}</p>}

          <div className="flex gap-2">
            <Button onClick={salvar} disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={testarConexao} disabled={testando}>{testando ? "Testando..." : "Testar conexão"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Último teste de conexão</span>
            <span className="flex items-center gap-1.5 text-foreground">
              {config.ultimo_teste_conexao_em ? (
                <>
                  {config.ultimo_teste_conexao_sucesso ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}
                  {formatDateTime(config.ultimo_teste_conexao_em)}
                </>
              ) : "Nunca testado"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Último webhook recebido</span>
            <span className="text-foreground">{config.ultimo_webhook_recebido_em ? formatDateTime(config.ultimo_webhook_recebido_em) : "Nenhum ainda"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Último pagamento aprovado</span>
            <span className="text-foreground">{config.ultimo_pagamento_aprovado_em ? formatDateTime(config.ultimo_pagamento_aprovado_em) : "Nenhum ainda"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
