import { NovaAnaliseForm } from "@/components/crediario/nova-analise-form";

export default function NovaAnalisePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Nova análise de crédito</h1>
        <p className="text-sm text-muted-foreground">O sistema calcula score, classe e limite automaticamente</p>
      </div>
      <NovaAnaliseForm />
    </div>
  );
}
