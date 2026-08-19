import { buscarConfiguracoesProstec } from "@/services/prostec/prostec.service";
import { ConfiguracoesProstecForm } from "@/components/prostec/configuracoes-prostec-form";

export default async function ConfiguracoesProstecPage() {
  const config = await buscarConfiguracoesProstec();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações — Prostec</h1>
        <p className="text-sm text-muted-foreground">Parâmetros de pontuação, comissão e prospecção</p>
      </div>

      <ConfiguracoesProstecForm config={config} />
    </div>
  );
}
