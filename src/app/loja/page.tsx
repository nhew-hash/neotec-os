import { listarHeroSlidesPublico, listarHomeSecoesPublico } from "@/services/loja/home-cms-publico.service";
import { BlocoHero } from "@/components/loja/blocos/bloco-hero";
import { RenderizadorSecao } from "@/components/loja/blocos/renderizador-secao";

// Mesmo motivo das outras páginas de loja — a vitrine de produtos em
// destaque mostra estoque, nunca pode ficar em cache.
export const revalidate = 0;

/**
 * Home 100% dirigida pelo CMS (Fase 64) — nada de conteúdo fixo em
 * código além dos componentes de bloco em si. Adicionar/remover/
 * reordenar seção é feito em Configurações → Home da Loja, sem deploy.
 */
export default async function LojaHomePage() {
  const [slides, secoes] = await Promise.all([listarHeroSlidesPublico(), listarHomeSecoesPublico()]);

  return (
    <div className="flex flex-col">
      <BlocoHero slides={slides} />
      {secoes.map((secao) => <RenderizadorSecao key={secao.id} secao={secao} />)}
    </div>
  );
}
