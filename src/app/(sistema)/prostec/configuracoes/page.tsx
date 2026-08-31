import { buscarConfiguracoesProstec, buscarConfigWhatsappProstec, buscarOfertaProstec } from "@/services/prostec/prostec.service";
import { ConfiguracoesProstecForm } from "@/components/prostec/configuracoes-prostec-form";
import { WhatsappProstecForm } from "@/components/prostec/whatsapp-prostec-form";
import { OfertaProstecForm } from "@/components/prostec/oferta-prostec-form";

export default async function ConfiguracoesProstecPage() {
  const [config, configWhatsapp, oferta] = await Promise.all([buscarConfiguracoesProstec(), buscarConfigWhatsappProstec(), buscarOfertaProstec()]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações — Prostec</h1>
        <p className="text-sm text-muted-foreground">Parâmetros de pontuação, comissão, prospecção, WhatsApp e oferta da Iara</p>
      </div>

      <WhatsappProstecForm config={configWhatsapp} />
      <OfertaProstecForm oferta={oferta} />
      <ConfiguracoesProstecForm config={config} />
    </div>
  );
}
