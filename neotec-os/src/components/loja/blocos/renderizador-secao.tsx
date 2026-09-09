import { BlocoVitrineProdutos } from "./bloco-vitrine-produtos";
import { BlocoBanner, BlocoCategorias, BlocoTradeIn, BlocoAssistencia, BlocoAvaliacoes, BlocoVideo, BlocoInstagram, BlocoTexto } from "./blocos-simples";
import type { HomeSecao } from "@/types";

/**
 * Único lugar que decide "qual componente renderiza esse tipo de
 * seção" — adicionar um tipo de bloco novo no futuro é só adicionar um
 * `case` aqui, mais o componente correspondente.
 */
export async function RenderizadorSecao({ secao }: { secao: HomeSecao }) {
  switch (secao.tipo) {
    case "vitrine_produtos": return <BlocoVitrineProdutos secao={secao} />;
    case "categorias": return <BlocoCategorias />;
    case "banner": return <BlocoBanner secao={secao} />;
    case "trade_in": return <BlocoTradeIn secao={secao} />;
    case "assistencia": return <BlocoAssistencia secao={secao} />;
    case "avaliacoes": return <BlocoAvaliacoes secao={secao} />;
    case "video": return <BlocoVideo secao={secao} />;
    case "instagram": return <BlocoInstagram secao={secao} />;
    case "texto": return <BlocoTexto secao={secao} />;
    default: return null;
  }
}
