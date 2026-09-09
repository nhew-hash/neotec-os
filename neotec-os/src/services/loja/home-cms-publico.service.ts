import { createClient } from "@/lib/supabase/server";
import type { HeroSlide, HomeSecao } from "@/types";

/**
 * Só o que está ativo e dentro da janela de data — filtro já embutido
 * na função SECURITY DEFINER (Fase 64), não em código aqui. É o
 * mecanismo de campanha sazonal: some/aparece sozinho pela data, sem
 * precisar de deploy nem de alguém lembrando de desativar manualmente.
 */
export async function listarHeroSlidesPublico(): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_hero_slides_publico");
  if (error) throw new Error(`Não foi possível carregar os slides: ${error.message}`);
  return (data ?? []) as HeroSlide[];
}

export async function listarHomeSecoesPublico(): Promise<HomeSecao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_home_secoes_publico");
  if (error) throw new Error(`Não foi possível carregar as seções: ${error.message}`);
  return (data ?? []) as HomeSecao[];
}
