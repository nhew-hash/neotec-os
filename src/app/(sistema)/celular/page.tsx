import Link from "next/link";
import { Camera, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtivarNotificacoes } from "@/components/celular/ativar-notificacoes";
import { SomMensagem } from "@/components/celular/som-mensagem";
import { listarCapturasPendentesAction } from "@/services/celular/celular.actions";
import { ROTULO_CONTEXTO } from "@/services/celular/captura";
import { formatDateTime } from "@/utils";

export const dynamic = "force-dynamic";

export default async function CelularPage() {
  const pendentes = await listarCapturasPendentesAction();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title="App no celular" description="Notificações e pedidos feitos no computador" />

      <Card>
        <CardHeader><CardTitle>Pedidos do computador</CardTitle></CardHeader>
        <CardContent>
          {!pendentes.success ? (
            <p role="alert" className="text-sm text-danger">{pendentes.error}</p>
          ) : pendentes.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido aberto. No computador, use “Tirar fotos pelo celular” ou “Ler IMEI pelo celular” na OS ou na troca.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendentes.data.map((p) => (
                <li key={p.id}>
                  <Link href={`/celular/captura/${p.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40">
                    {p.tipo === "fotos" ? <Camera className="h-5 w-5 text-primary" aria-hidden /> : <ScanLine className="h-5 w-5 text-primary" aria-hidden />}
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{p.tipo === "fotos" ? "Tirar fotos" : "Ler IMEI"} — {ROTULO_CONTEXTO[p.contextoTipo]}</span>
                      <span className="block text-xs text-muted-foreground">{p.rotulo ? `${p.rotulo} · ` : ""}{formatDateTime(p.criadoEm)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notificações neste aparelho</CardTitle></CardHeader>
        <CardContent><AtivarNotificacoes /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Som</CardTitle></CardHeader>
        <CardContent><SomMensagem /></CardContent>
      </Card>
    </div>
  );
}
