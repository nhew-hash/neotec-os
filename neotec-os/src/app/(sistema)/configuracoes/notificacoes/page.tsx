import { PreferenciasNotificacaoPanel } from "@/components/configuracoes/preferencias-notificacao-panel";
import { PageHeader } from "@/components/ui/page-header";

export default function ConfiguracaoNotificacoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notificações" description="Som, notificação desktop e comportamento do WhatsApp neste dispositivo" />
      <PreferenciasNotificacaoPanel />
    </div>
  );
}
