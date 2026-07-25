import { ShieldCheck, FileCheck, Building2, Wrench, Lock, BadgeCheck } from "lucide-react";
import { listarSelosConfiancaPublico } from "@/services/marketing/marketing-publico.service";
import type { TipoSeloConfianca } from "@/types";

const ICONE_POR_TIPO: Record<TipoSeloConfianca, typeof ShieldCheck> = {
  produto_original: BadgeCheck,
  garantia: ShieldCheck,
  nota_fiscal: FileCheck,
  loja_fisica: Building2,
  assistencia_tecnica: Wrench,
  pagamento_seguro: Lock,
};

export async function FaixaSelosConfianca() {
  const selos = await listarSelosConfiancaPublico();
  if (selos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {selos.map((selo) => {
        const Icone = ICONE_POR_TIPO[selo.tipo];
        return (
          <div key={selo.id} className="flex items-center gap-1.5 rounded-lg bg-[#FAFBFC] px-2.5 py-2 text-[11px] text-foreground">
            <Icone className="h-3.5 w-3.5 shrink-0 text-primary" />
            {selo.label}
          </div>
        );
      })}
    </div>
  );
}
