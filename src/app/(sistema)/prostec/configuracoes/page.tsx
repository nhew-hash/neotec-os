import { buscarConfiguracoesProstec, buscarConfigWhatsappProstec, listarProdutosProstec } from "@/services/prostec/prostec.service";
import { ConfiguracoesProstecForm } from "@/components/prostec/configuracoes-prostec-form";
import { WhatsappProstecForm } from "@/components/prostec/whatsapp-prostec-form";
import { ProdutosProstecForm } from "@/components/prostec/produtos-prostec-form";

export default async function ConfiguracoesProstecPage() {
  const [config, configWhatsapp, produtos] = await Promise.all([buscarConfiguracoesProstec(), buscarConfigWhatsappProstec(), listarProdutosProstec()]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações — Prostec</h1>
        <p className="text-sm text-muted-foreground">Parâmetros de pontuação, comissão, prospecção, WhatsApp e catálogo de produtos da Iara</p>
      </div>

      <WhatsappProstecForm config={configWhatsapp} />
      <ProdutosProstecForm produtos={produtos} />
      <ConfiguracoesProstecForm config={config} />
    </div>
  );
}
