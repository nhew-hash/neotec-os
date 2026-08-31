import { NovoContratoForm } from "@/components/contratos/novo-contrato-form";

export default function NovoContratoPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Novo contrato — Neotec Assinatura</h1>
        <p className="text-sm text-muted-foreground">Preenche os dados — o sistema gera o contrato a partir do modelo ativo</p>
      </div>
      <NovoContratoForm />
    </div>
  );
}
