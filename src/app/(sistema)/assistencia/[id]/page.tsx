import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ShieldCheck, Smartphone } from "lucide-react";
import { BotaoImprimir } from "@/components/impressao/botao-imprimir";
import { AssinaturaDigitalPanel } from "@/components/impressao/assinatura-digital-panel";
import { buscarOSPorId, listarPecasPorOS, listarChecklistsPorOS } from "@/services/assistencia/assistencia.service";
import { listarProdutos } from "@/services/estoque/estoque.service";
import { assinaturaDigitalHabilitada, buscarAssinaturas } from "@/services/impressao/assinatura.service";
import { DiagnosticoForm, PecasOSForm } from "@/components/assistencia/diagnostico-form";
import { ChecklistOSForm } from "@/components/assistencia/checklist-os-form";
import { StatusOSControl } from "@/components/assistencia/status-os-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatWhatsapp } from "@/utils";

export default async function OSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const os = await buscarOSPorId(id);
  if (!os) notFound();

  const [pecas, produtos, checklists, assinaturaHabilitada, assinaturas] = await Promise.all([
    listarPecasPorOS(id), listarProdutos(), listarChecklistsPorOS(id),
    assinaturaDigitalHabilitada(), buscarAssinaturas("os", id),
  ]);
  const checklistRecebimento = checklists.find((c) => c.tipo === "recebimento");
  const checklistEntrega = checklists.find((c) => c.tipo === "entrega");

  const prazoAtrasado = os.prazo && os.status !== "entregue" && new Date(os.prazo) < new Date();

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho — identidade da OS + controle de status, tudo à vista */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-foreground">{os.numero_os}</h1>
            {os.urgente && <Badge variant="danger">Urgente</Badge>}
          </div>
          <Link href={`/clientes/${os.cliente.id}`} className="text-sm text-primary hover:underline">
            {os.cliente.nome}
          </Link>
          <p className="text-xs text-muted-foreground">Aberta em {formatDate(os.data_entrada)}</p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <StatusOSControl osId={os.id} statusAtual={os.status} />
          <div className="flex items-center gap-2">
            <BotaoImprimir tipo="os" id={id} formato="a4" label="A4" />
            <BotaoImprimir tipo="os" id={id} formato="cupom" label="Cupom" />
          </div>
          {assinaturaHabilitada && (
            <AssinaturaDigitalPanel
              tipoDocumento="os"
              referenciaId={id}
              jaColetadas={assinaturas.map((a) => a.tipo_assinante)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal — a "história" do reparo, na ordem em que acontece */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Relato e diagnóstico</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Defeito relatado pelo cliente</p>
                <p className="text-sm text-foreground">{os.defeito}</p>
              </div>

              {os.diagnostico_inicial && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diagnóstico inicial (na abertura)</p>
                  <p className="text-sm text-foreground">{os.diagnostico_inicial}</p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Diagnóstico técnico</p>
                <DiagnosticoForm osId={os.id} diagnosticoAtual={os.diagnostico} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="recebimento">
                <TabsList>
                  <TabsTrigger value="recebimento">Recebimento</TabsTrigger>
                  <TabsTrigger value="entrega">Entrega</TabsTrigger>
                </TabsList>
                <TabsContent value="recebimento">
                  <ChecklistOSForm osId={os.id} tipo="recebimento" inicial={checklistRecebimento} />
                </TabsContent>
                <TabsContent value="entrega">
                  <ChecklistOSForm osId={os.id} tipo="entrega" inicial={checklistEntrega} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Peças utilizadas</CardTitle></CardHeader>
            <CardContent><PecasOSForm osId={os.id} produtos={produtos} pecas={pecas} /></CardContent>
          </Card>
        </div>

        {/* Sidebar — informações de apoio, sempre visíveis, sem precisar rolar a tela toda */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Aparelho</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                {os.aparelho_descricao ?? "Não informado"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <Link href={`/clientes/${os.cliente.id}`} className="font-medium text-foreground hover:underline">
                {os.cliente.nome}
              </Link>
              <span className="font-mono text-xs text-muted-foreground">{formatWhatsapp(os.cliente.whatsapp)}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Prazos</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Prazo:</span>
                {os.prazo ? (
                  <Badge variant={prazoAtrasado ? "danger" : "secondary"}>{formatDate(os.prazo)}</Badge>
                ) : (
                  <span className="text-muted-foreground">Não definido</span>
                )}
              </div>
              {os.garantia_dias && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Garantia:</span>
                  <span className="text-foreground">{os.garantia_dias} dias após a entrega</span>
                </div>
              )}
              {os.data_saida && (
                <p className="text-xs text-muted-foreground">Entregue em {formatDate(os.data_saida)}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
