import { listarModelosIphoneDisponiveisPublico } from "@/services/pre-analise/pre-analise.service";
import { PreAnaliseWizard } from "@/components/pre-analise/pre-analise-wizard";

export const revalidate = 0;

export default async function PreAnalisePage() {
  const modelos = await listarModelosIphoneDisponiveisPublico();

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="mx-auto max-w-md">
        <PreAnaliseWizard modelos={modelos} />
      </div>
    </div>
  );
}
