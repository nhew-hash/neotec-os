"use client";

import { useState, useTransition } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  ativarProdutoQuenteAction,
  atualizarLinkMlProdutoQuenteAction,
  atualizarVideoProdutoQuenteAction,
  regenerarConteudoProdutoQuenteAction,
} from "@/services/loja/produto-quente.actions";
import { Button } from "@/components/ui/button";

/**
 * Painel do recurso "Produto Quente" na página de detalhe do produto
 * (admin) — mesmo espírito do `ToggleTradeIn`: liga/desliga direto,
 * sem formulário complexo (item 23 do brief: "não quero um editor
 * complexo de landing pages"). Ligar já dispara a geração de conteúdo
 * por IA automaticamente; "Regenerar" existe pra quando o admin
 * editar o link de referência ou quiser um novo texto.
 */
export function PainelProdutoQuente({
  produtoId, slug, ligadoInicial, linkMlInicial, videoUrlInicial, temConteudoInicial,
}: {
  produtoId: string;
  slug: string | null;
  ligadoInicial: boolean;
  linkMlInicial: string | null;
  videoUrlInicial: string | null;
  temConteudoInicial: boolean;
}) {
  const [ligado, setLigado] = useState(ligadoInicial);
  const [linkMl, setLinkMl] = useState(linkMlInicial ?? "");
  const [videoUrl, setVideoUrl] = useState(videoUrlInicial ?? "");
  const [temConteudo, setTemConteudo] = useState(temConteudoInicial);
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleToggle() {
    const novoValor = !ligado;
    setErro(null);
    setMensagem(null);
    setLigado(novoValor); // otimista
    startTransition(async () => {
      const result = await ativarProdutoQuenteAction(produtoId, novoValor);
      if (!result.success) {
        setLigado(!novoValor); // desfaz
        setErro(result.error);
        return;
      }
      if (novoValor) {
        setTemConteudo(result.data.conteudoGerado || temConteudo);
        setMensagem(result.data.conteudoGerado ? "Ativado — conteúdo gerado com IA." : "Ativado, mas a geração de conteúdo falhou. Tenta \"Regenerar\" abaixo.");
      }
    });
  }

  function handleSalvarLink() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const result = await atualizarLinkMlProdutoQuenteAction(produtoId, linkMl);
      if (!result.success) return setErro(result.error);
      setMensagem("Link de referência salvo.");
    });
  }

  function handleSalvarVideo() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const result = await atualizarVideoProdutoQuenteAction(produtoId, videoUrl);
      if (!result.success) return setErro(result.error);
      setMensagem("Vídeo salvo.");
    });
  }

  function handleRegenerar() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const result = await regenerarConteudoProdutoQuenteAction(produtoId);
      if (!result.success) return setErro(result.error);
      setTemConteudo(true);
      setMensagem("Conteúdo regenerado com IA.");
    });
  }

  return (
    <div className="mt-1 flex flex-col gap-3 border-t border-border pt-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">🔥 Produto Quente</span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ligado ? "bg-primary" : "bg-secondary"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${ligado ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </label>

      {ligado && (
        <>
          <p className="text-xs text-success-text">
            Página de Alta Conversão ativa{!temConteudo && !isPending ? " — ainda sem conteúdo gerado" : ""}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Link de referência (ex: Mercado Livre)</label>
            <div className="flex gap-1.5">
              <input
                value={linkMl}
                onChange={(e) => setLinkMl(e.target.value)}
                placeholder="https://produto.mercadolivre.com.br/..."
                className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleSalvarLink} disabled={isPending}>Salvar</Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Vídeo (opcional — YouTube ou link .mp4)</label>
            <div className="flex gap-1.5">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleSalvarVideo} disabled={isPending}>Salvar</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={handleRegenerar} disabled={isPending}>
              <RefreshCw className="h-3.5 w-3.5" />{isPending ? "Gerando..." : "Regenerar conteúdo com IA"}
            </Button>
            {slug && (
              <a href={`/loja/produto/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Ver página<ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </>
      )}

      {mensagem && <p className="text-xs text-success-text">{mensagem}</p>}
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
