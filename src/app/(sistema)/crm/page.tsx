import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { listarConversasComCliente } from "@/services/crm/crm.service";
import { FunilKanban } from "@/components/crm/funil-kanban";
import { Button } from "@/components/ui/button";

export default async function CrmPage() {
  const conversas = await listarConversasComCliente();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">CRM — Funil de vendas</h1>
          <p className="text-sm text-muted-foreground">{conversas.length} lead(s) em andamento</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/crm/retornos">
            <CalendarClock className="h-4 w-4" />
            Retornos
          </Link>
        </Button>
      </div>

      <FunilKanban conversas={conversas} />
    </div>
  );
}
