import { buscarConfiguracao } from "@/services/neoloc/neoloc.service";
import { ConfiguracaoForm } from "@/components/neoloc/configuracao-form";

export default async function ConfiguracoesNeoLocPage() {
  const configuracao = await buscarConfiguracao();

  if (!configuracao) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações do NeoLoc</h1>
        <p className="text-sm text-muted-foreground">Não foi possível carregar a configuração da loja.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações do NeoLoc</h1>
        <p className="text-sm text-muted-foreground">Regras de cobrança e recolhimento aplicadas pela avaliação automática (rodada 1x/dia, junto do cron do Crediário).</p>
      </div>
      <ConfiguracaoForm configuracao={configuracao} />
    </div>
  );
}
