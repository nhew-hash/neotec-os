import { listarFotosCatalogo, urlPublicaFotoCatalogo } from "@/services/catalogo-fotos/catalogo-fotos.service";
import { CatalogoFotosPanel } from "@/components/catalogo-fotos/catalogo-fotos-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function CatalogoFotosPage() {
  const fotos = await listarFotosCatalogo();
  const fotosComUrl = fotos.map((f) => ({ ...f, url: urlPublicaFotoCatalogo(f.caminho_storage) }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo de fotos"
        description="Fotos reutilizáveis (ex: iPhone 13 Preto Seminovo) — equipe e IA usam pra enviar sem precisar de foto nova toda vez"
      />
      <CatalogoFotosPanel fotos={fotosComUrl} />
    </div>
  );
}
