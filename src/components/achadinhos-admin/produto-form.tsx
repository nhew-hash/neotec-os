"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FORMULARIO_VAZIO, descontoSugerido, type FormularioProduto } from "@/lib/achadinhos/formulario";
import { STATUS_INFO } from "@/lib/achadinhos/status";
import { STATUS_PRODUTO } from "@/lib/achadinhos/tipos";
import { salvarProdutoAction, uploadImagemAction } from "@/services/achadinhos/achadinhos.actions";

function Campo({ id, rotulo, dica, children }: { id: string; rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

export function ProdutoForm({ produtoId, inicial, categorias, slug }: { produtoId: string | null; inicial?: FormularioProduto; categorias: string[]; slug?: string }) {
  const router = useRouter();
  const [f, setF] = useState<FormularioProduto>(inicial ?? FORMULARIO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvando, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FormularioProduto>(k: K, v: FormularioProduto[K]) => setF((x) => ({ ...x, [k]: v }));
  const sugestao = descontoSugerido(f.preco_atual, f.preco_anterior);

  async function enviarImagem(file: File | undefined) {
    if (!file) return;
    setErro(null);
    setEnviando(true);
    const fd = new FormData();
    fd.append("arquivo", file);
    const r = await uploadImagemAction(fd);
    setEnviando(false);
    if (arquivo.current) arquivo.current.value = "";
    if (r.success) set("imagem_principal", r.data.url);
    else setErro(r.error);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await salvarProdutoAction(produtoId, f);
      if (!r.success) { setErro(r.error); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (!produtoId) { router.push("/achadinhos-admin"); router.refresh(); return; }
      setAviso("Alterações salvas.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="mx-auto max-w-3xl space-y-6">
      {erro && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      {aviso && <p role="status" className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success-text">{aviso}</p>}

      <Card className="space-y-4 p-5">
        <Campo id="nome" rotulo="Nome do produto">
          <Input id="nome" required minLength={2} maxLength={160} value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Fone Bluetooth com cancelamento de ruído" />
        </Campo>
        <Campo id="link" rotulo="Link de afiliado do Mercado Livre" dica="Aceita links mercadolivre.com.br e meli.la. É para onde a pessoa vai ao clicar em comprar.">
          <Input id="link" required type="url" inputMode="url" value={f.link_afiliado} onChange={(e) => set("link_afiliado", e.target.value)} placeholder="https://meli.la/..." />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="preco" rotulo="Preço atual (R$)" dica="Deixe em branco se não souber. O site mostra “Veja o preço no Mercado Livre”.">
            <Input id="preco" inputMode="decimal" value={f.preco_atual} onChange={(e) => set("preco_atual", e.target.value)} placeholder="199,90" />
          </Campo>
          <Campo id="anterior" rotulo="Preço anterior (R$)" dica="Só preencha se o preço realmente caiu. Precisa ser maior que o atual.">
            <Input id="anterior" inputMode="decimal" value={f.preco_anterior} onChange={(e) => set("preco_anterior", e.target.value)} placeholder="249,90" />
          </Campo>
        </div>
        {sugestao != null && f.desconto_percentual.trim() === "" && (
          <p className="text-sm text-muted-foreground">
            Pelos preços, o desconto é de {sugestao}%.{" "}
            <button type="button" className="font-medium text-primary underline" onClick={() => set("desconto_percentual", String(sugestao))}>Mostrar no site</button>
          </p>
        )}
        <Campo id="imagem" rotulo="Imagem principal" dica="Envie um arquivo (até 5MB) ou cole o endereço de uma imagem.">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.imagem_principal ? <img src={f.imagem_principal} alt="" className="h-20 w-20 shrink-0 rounded-md border border-border object-cover" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-dashed border-border text-muted-foreground"><ImagePlus /></div>}
            <div className="flex-1 space-y-2">
              <Input id="imagem" type="url" value={f.imagem_principal} onChange={(e) => set("imagem_principal", e.target.value)} placeholder="https://..." />
              <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" id="arquivo-imagem" onChange={(e) => enviarImagem(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" loading={enviando} loadingText="Enviando..." onClick={() => arquivo.current?.click()}>Enviar imagem</Button>
            </div>
          </div>
        </Campo>
        {!produtoId && (
          <Campo id="status" rotulo="Publicar agora?" dica="Rascunho não aparece no site. Dá pra ativar depois, na lista.">
            <select id="status" value={f.status} onChange={(e) => set("status", e.target.value as FormularioProduto["status"])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {STATUS_PRODUTO.filter((s) => s !== "arquivado").map((s) => <option key={s} value={s}>{STATUS_INFO[s].label} — {STATUS_INFO[s].descricao}</option>)}
            </select>
          </Campo>
        )}
      </Card>

      <details className="group rounded-lg border border-border bg-card" open={!!produtoId}>
        <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium">Mais detalhes (descrição, galeria, informações, SEO)</summary>
        <div className="space-y-4 border-t border-border p-5">
          <Campo id="descricao" rotulo="Descrição" dica="Só o que você sabe do produto. Nada de inventar característica ou garantia.">
            <Textarea id="descricao" rows={5} maxLength={5000} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="categoria" rotulo="Categoria">
              <Input id="categoria" list="categorias-achadinhos" maxLength={60} value={f.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Fones, Carregadores..." />
              <datalist id="categorias-achadinhos">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
            </Campo>
            <Campo id="tags" rotulo="Tags" dica="Separadas por vírgula.">
              <Input id="tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="bluetooth, gamer" />
            </Campo>
            <Campo id="selo" rotulo="Selo" dica="Texto curto no card, ex.: Novo. Não use para prometer o que não é verdade.">
              <Input id="selo" maxLength={30} value={f.selo} onChange={(e) => set("selo", e.target.value)} />
            </Campo>
            <Campo id="desconto" rotulo="Desconto exibido (%)" dica="Precisa bater com os preços (diferença de até 1,5 ponto).">
              <Input id="desconto" inputMode="decimal" value={f.desconto_percentual} onChange={(e) => set("desconto_percentual", e.target.value)} />
            </Campo>
          </div>
          <Campo id="galeria" rotulo="Outras imagens" dica="Uma por linha, até 12.">
            <Textarea id="galeria" rows={3} value={f.imagens} onChange={(e) => set("imagens", e.target.value)} placeholder="https://..." />
          </Campo>
          <Campo id="video" rotulo="Vídeo" dica="Link do YouTube ou arquivo .mp4.">
            <Input id="video" type="url" value={f.video_url} onChange={(e) => set("video_url", e.target.value)} />
          </Campo>

          <div className="space-y-2">
            <Label>Informações do produto</Label>
            {f.informacoes.map((i, idx) => (
              <div key={idx} className="flex gap-2">
                <Input aria-label="Nome da informação" placeholder="Ex.: Cor" value={i.rotulo} onChange={(e) => set("informacoes", f.informacoes.map((x, n) => (n === idx ? { ...x, rotulo: e.target.value } : x)))} className="w-1/3" />
                <Input aria-label="Valor da informação" placeholder="Ex.: Preto" value={i.valor} onChange={(e) => set("informacoes", f.informacoes.map((x, n) => (n === idx ? { ...x, valor: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="sm" aria-label="Remover informação" onClick={() => set("informacoes", f.informacoes.filter((_, n) => n !== idx))}><X /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set("informacoes", [...f.informacoes, { rotulo: "", valor: "" }])}><Plus /> Adicionar informação</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo id="ordem" rotulo="Ordem" dica="Menor aparece primeiro.">
              <Input id="ordem" type="number" value={f.ordem} onChange={(e) => set("ordem", e.target.value)} />
            </Campo>
            <Campo id="score" rotulo="Score">
              <Input id="score" type="number" step="any" value={f.score} onChange={(e) => set("score", e.target.value)} />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={f.destaque} onChange={(e) => set("destaque", e.target.checked)} className="h-4 w-4" /> Destacar no site
            </label>
          </div>
          <Campo id="obs" rotulo="Observações internas" dica="Só você vê. Não aparece no site.">
            <Textarea id="obs" rows={2} maxLength={2000} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </Campo>

          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm font-medium">Google e redes sociais</p>
            <Campo id="seo-t" rotulo="Título para o Google" dica="Até 70 caracteres. Em branco, usa o nome do produto.">
              <Input id="seo-t" maxLength={70} value={f.seo_titulo} onChange={(e) => set("seo_titulo", e.target.value)} />
            </Campo>
            <Campo id="seo-d" rotulo="Descrição para o Google" dica="Até 170 caracteres.">
              <Textarea id="seo-d" rows={2} maxLength={170} value={f.seo_descricao} onChange={(e) => set("seo_descricao", e.target.value)} />
            </Campo>
            <Campo id="og" rotulo="Imagem de compartilhamento" dica="Em branco, usa a imagem principal.">
              <Input id="og" type="url" value={f.imagem_og} onChange={(e) => set("imagem_og", e.target.value)} />
            </Campo>
          </div>
        </div>
      </details>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        {slug && <Link href={`/achadinhos/${slug}`} target="_blank" className="mr-auto text-sm text-muted-foreground underline">Ver no site</Link>}
        <Link href="/achadinhos-admin" className={buttonVariants({ variant: "outline" })}>Voltar</Link>
        <Button type="submit" loading={salvando} loadingText="Salvando...">{produtoId ? "Salvar alterações" : "Cadastrar produto"}</Button>
      </div>
    </form>
  );
}
