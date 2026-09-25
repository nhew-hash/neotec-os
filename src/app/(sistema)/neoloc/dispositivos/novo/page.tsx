import { listarAparelhosSemDispositivoNeoLoc } from "@/services/neoloc/neoloc.service";
import { CadastrarDispositivoForm } from "@/components/neoloc/cadastrar-dispositivo-form";

export default async function NovoDispositivoNeoLocPage() {
  const aparelhos = await listarAparelhosSemDispositivoNeoLoc();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Cadastrar dispositivo NeoLoc</h1>
        <p className="text-sm text-muted-foreground">Vincula um aparelho já em locação (Crediário) ao controle de MDM do NeoLoc.</p>
      </div>
      <CadastrarDispositivoForm aparelhos={aparelhos} />
    </div>
  );
}
