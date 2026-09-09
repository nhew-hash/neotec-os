import { listarRegrasLucro } from "@/services/seminovos/regras-lucro.service";
import { RegrasLucroPanel } from "@/components/seminovos/regras-lucro-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function RegrasLucroPage() {
  const regras = await listarRegrasLucro();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Regras de Lucro" description="Usadas pelo cadastro assistido por IA de seminovos, pra calcular o preço de venda automaticamente" />
      <RegrasLucroPanel regras={regras} />
    </div>
  );
}
