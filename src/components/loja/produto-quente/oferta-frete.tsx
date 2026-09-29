import { Truck } from "lucide-react";
import { listarRegrasFretePublico } from "@/services/loja-admin/central-loja.service";
import { formatCurrency } from "@/utils";

/**
 * Item 12 do brief: mostrar frete de forma bem visível. Usa a regra
 * nacional real já cadastrada (`regras_frete.nacional`) — só anuncia
 * "FRETE GRÁTIS" quando o valor cadastrado for realmente zero. Se a
 * loja cobrar frete nacional (valor > 0), mostra o valor/prazo reais
 * em vez de inventar frete grátis que não existe.
 */
export async function OfertaFrete() {
  const regras = await listarRegrasFretePublico().catch(() => []);
  const nacional = regras.find((r) => r.nacional);
  if (!nacional) return null;

  const gratis = nacional.valor === 0;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${gratis ? "bg-success/10 text-success-text" : "bg-[#FAFBFC] text-foreground"}`}>
      <Truck className="h-4 w-4 shrink-0" />
      {gratis
        ? `🚚 FRETE GRÁTIS para todo o Brasil${nacional.prazo_dias_uteis ? ` — em até ${nacional.prazo_dias_uteis} dias úteis` : ""}`
        : `Entrega para todo o Brasil por ${formatCurrency(nacional.valor)}${nacional.prazo_dias_uteis ? ` — em até ${nacional.prazo_dias_uteis} dias úteis` : ""}`}
    </div>
  );
}
