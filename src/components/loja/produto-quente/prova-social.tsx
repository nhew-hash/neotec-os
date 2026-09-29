import { Star } from "lucide-react";
import { listarAvaliacoesPublicoProduto } from "@/services/loja/loja-publica.service";

/**
 * Prova social real — puxa `avaliacoes_loja` aprovadas desse produto
 * (a função pública já existia desde a Fase 81, mas nenhuma página da
 * loja a usava até agora). Nota média e contagem calculadas em cima
 * dos dados de verdade; se não houver avaliação nenhuma, a seção some
 * inteira — nunca mostra nota/contagem inventada (item 6/14 do brief).
 */
export async function ProvaSocial({ produtoId }: { produtoId: string }) {
  const avaliacoes = await listarAvaliacoesPublicoProduto(produtoId).catch(() => []);
  if (avaliacoes.length === 0) return null;

  const notaMedia = avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-warning">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4" fill={i < Math.round(notaMedia) ? "currentColor" : "none"} />
          ))}
        </div>
        <span className="text-sm font-semibold text-foreground">{notaMedia.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">
          ({avaliacoes.length} avaliaç{avaliacoes.length > 1 ? "ões" : "ão"})
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {avaliacoes.slice(0, 6).map((a) => (
          <div key={a.id} className="rounded-2xl bg-[#FAFBFC] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{a.nome_cliente}{a.cidade ? ` — ${a.cidade}` : ""}</span>
              <div className="flex items-center gap-0.5 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3" fill={i < a.nota ? "currentColor" : "none"} />
                ))}
              </div>
            </div>
            {a.comentario && <p className="mt-1.5 text-xs text-muted-foreground">{a.comentario}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
