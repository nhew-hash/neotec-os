import Link from "next/link";
import { UserPlus, ShoppingBag, Wrench, ShieldCheck, Gift, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatWhatsapp, getInitials } from "@/utils";
import type { ResumoClienteAtendimento } from "@/services/comunicacao/comunicacao-cliente-resumo.service";

export function ClienteInfoPanel({ resumo }: { resumo: ResumoClienteAtendimento }) {
  if (!resumo.cliente) {
    return (
      <div className="hidden w-72 shrink-0 border-l border-border p-4 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-2">
        <UserPlus className="h-6 w-6 text-muted-foreground" />
        <p className="text-center text-xs text-muted-foreground">
          Essa conversa ainda não está vinculada a um cadastro de cliente.
        </p>
      </div>
    );
  }

  const { cliente } = resumo;

  return (
    <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border p-4 lg:flex">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {getInitials(cliente.nome)}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{cliente.nome}</p>
          <p className="font-mono text-xs text-muted-foreground">{formatWhatsapp(cliente.whatsapp)}</p>
        </div>

        {resumo.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {resumo.tags.map((tag) => (
              <Badge key={tag} variant={tag === "VIP" ? "default" : "secondary"} className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" asChild>
          <Link href={`/clientes/${cliente.id}`}><ExternalLink className="h-3.5 w-3.5" />Ver perfil completo</Link>
        </Button>
      </div>

      {resumo.etapaFunil && (
        <Card className="border-l-4" style={{ borderLeftColor: resumo.etapaFunil.cor }}>
          <CardContent className="flex flex-col gap-0.5 p-3">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Etapa no CRM</span>
            <span className="text-sm font-medium text-foreground">{resumo.etapaFunil.nome}</span>
            {resumo.etapaFunil.valorEstimado != null && (
              <span className="text-xs text-muted-foreground">{formatCurrency(resumo.etapaFunil.valorEstimado)}</span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Card><CardContent className="flex items-center gap-2.5 p-2.5">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground">Compras</span>
          <span className="text-sm font-medium text-foreground">{resumo.totalVendas}</span>
        </CardContent></Card>

        <Card><CardContent className="flex items-center gap-2.5 p-2.5">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground">OS em aberto</span>
          <span className="text-sm font-medium text-foreground">{resumo.osAbertas}</span>
        </CardContent></Card>

        <Card><CardContent className="flex items-center gap-2.5 p-2.5">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground">Garantias ativas</span>
          <span className="text-sm font-medium text-foreground">{resumo.garantiasAtivas}</span>
        </CardContent></Card>

        <Card><CardContent className="flex items-center gap-2.5 p-2.5">
          <Gift className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground">Cashback</span>
          <span className="text-sm font-medium text-foreground">{formatCurrency(resumo.saldoCashback)}</span>
        </CardContent></Card>
      </div>
    </div>
  );
}
