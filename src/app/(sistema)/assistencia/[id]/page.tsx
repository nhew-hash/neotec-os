import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Receipt } from "lucide-react";
import { buscarOSPorId, listarPecasPorOS, listarChecklistsPorOS } from "@/services/assistencia/assistencia.service";
import { listarProdutos } from "@/services/estoque/estoque.service";
import { DiagnosticoForm, PecasOSForm } from "@/components/assistencia/diagnostico-form";
import { ChecklistOSForm } from "@/components/assistencia/checklist-os-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils";

export default async function OSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const os = await buscarOSPorId(id);
  if (!os) notFound();

  const [pecas, produtos, checklists] = await Promise.all([
    listarPecasPorOS(id), listarProdutos(), listarChecklistsPorOS(id),
  ]);
  const checklistRecebimento = checklists.find((c) => c.tipo === "recebimento");
  const checklistEntrega = checklists.find((c) => c.tipo === "entrega");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-foreground">{os.numero_os}</h1>
            {os.urgente && <Badge variant="danger">Urgente</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{os.cliente.nome} · Aberta em {formatDate(os.data_entrada)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/impressao/os/${id}?formato=a4`} target="_blank"><Printer className="h-4 w-4" />A4</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/impressao/os/${id}?formato=cupom`} target="_blank"><Receipt className="h-4 w-4" />Cupom</Link>
          </Button>
          <Badge>{os.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Defeito relatado</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{os.defeito}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Diagnóstico</CardTitle></CardHeader>
          <CardContent><DiagnosticoForm osId={os.id} diagnosticoInicial={os.diagnostico} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Checklist de recebimento</CardTitle></CardHeader>
          <CardContent><ChecklistOSForm osId={os.id} tipo="recebimento" inicial={checklistRecebimento} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Checklist de entrega</CardTitle></CardHeader>
          <CardContent><ChecklistOSForm osId={os.id} tipo="entrega" inicial={checklistEntrega} /></CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Peças utilizadas</CardTitle></CardHeader>
          <CardContent><PecasOSForm osId={os.id} produtos={produtos} pecas={pecas} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
