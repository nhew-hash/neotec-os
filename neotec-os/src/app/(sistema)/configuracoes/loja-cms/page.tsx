import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarHeroSlides, listarHomeSecoes } from "@/services/loja/home-cms.service";
import { HeroSlidesPanel } from "@/components/loja-cms/hero-slides-panel";
import { HomeSecoesPanel } from "@/components/loja-cms/home-secoes-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function LojaCmsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/configuracoes");

  const [slides, secoes] = await Promise.all([listarHeroSlides(), listarHomeSecoes()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Home da Loja" description="Editor da página inicial pública — sem precisar de deploy pra mudar" />
      <HeroSlidesPanel slides={slides} />
      <HomeSecoesPanel secoes={secoes} />
    </div>
  );
}
