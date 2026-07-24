"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { TipoSecaoHome } from "@/types";

interface SecaoConfigFormProps {
  tipo: TipoSecaoHome;
  configuracao: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface ItemLista {
  titulo: string;
  descricao: string;
  nota?: string;
}

/**
 * Um formulário só, que muda de cara conforme o `tipo` — em vez de 9
 * componentes separados quase idênticos. O formato do JSON salvo varia
 * por tipo (documentado na migração), lido pelos blocos de renderização
 * da home (`components/loja/blocos/`).
 */
export function SecaoConfigForm({ tipo, configuracao, onChange }: SecaoConfigFormProps) {
  const [config, setConfig] = useState(configuracao);

  function atualizar(campo: string, valor: unknown) {
    const novo = { ...config, [campo]: valor };
    setConfig(novo);
    onChange(novo);
  }

  const itens = (config.itens as ItemLista[] | undefined) ?? [];

  function atualizarItem(index: number, campo: keyof ItemLista, valor: string) {
    const novaLista = itens.map((item, i) => (i === index ? { ...item, [campo]: valor } : item));
    atualizar("itens", novaLista);
  }

  function adicionarItem() {
    atualizar("itens", [...itens, { titulo: "", descricao: "" }]);
  }

  function removerItem(index: number) {
    atualizar("itens", itens.filter((_, i) => i !== index));
  }

  switch (tipo) {
    case "categorias":
      return <p className="text-xs text-muted-foreground">Mostra todas as categorias automaticamente — sem configuração adicional.</p>;

    case "banner":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          <Input placeholder="Subtítulo" defaultValue={(config.subtitulo as string) ?? ""} onBlur={(e) => atualizar("subtitulo", e.target.value)} />
          <Input placeholder="Link (ex: /loja/categoria/iphone)" defaultValue={(config.link as string) ?? ""} onBlur={(e) => atualizar("link", e.target.value)} />
          <Input placeholder="Texto do botão" defaultValue={(config.texto_botao as string) ?? ""} onBlur={(e) => atualizar("texto_botao", e.target.value)} />
        </div>
      );

    case "vitrine_produtos":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título da seção (ex: Destaques)" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          <Input type="number" placeholder="Quantidade de produtos" defaultValue={(config.quantidade as number) ?? 8} onBlur={(e) => atualizar("quantidade", Number(e.target.value) || 8)} />
        </div>
      );

    case "trade_in":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          <Textarea placeholder="Descrição" defaultValue={(config.descricao as string) ?? ""} onBlur={(e) => atualizar("descricao", e.target.value)} rows={2} />
          <Input placeholder="Texto do botão" defaultValue={(config.texto_botao as string) ?? ""} onBlur={(e) => atualizar("texto_botao", e.target.value)} />
        </div>
      );

    case "video":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          <Input placeholder="URL de embed (YouTube/Vimeo)" defaultValue={(config.url_video as string) ?? ""} onBlur={(e) => atualizar("url_video", e.target.value)} />
        </div>
      );

    case "instagram":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          <Input placeholder="@usuário" defaultValue={(config.handle as string) ?? ""} onBlur={(e) => atualizar("handle", e.target.value)} />
          <Input placeholder="Link do perfil" defaultValue={(config.link as string) ?? ""} onBlur={(e) => atualizar("link", e.target.value)} />
        </div>
      );

    case "texto":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          <Textarea placeholder="Texto" defaultValue={(config.corpo as string) ?? ""} onBlur={(e) => atualizar("corpo", e.target.value)} rows={4} />
        </div>
      );

    case "assistencia":
    case "avaliacoes":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="Título da seção" defaultValue={(config.titulo as string) ?? ""} onBlur={(e) => atualizar("titulo", e.target.value)} />
          {itens.map((item, index) => (
            <div key={index} className="flex items-start gap-1.5 rounded-md border border-border p-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Input placeholder={tipo === "avaliacoes" ? "Nome do cliente" : "Título"} defaultValue={item.titulo} onBlur={(e) => atualizarItem(index, "titulo", e.target.value)} />
                <Textarea placeholder={tipo === "avaliacoes" ? "Texto da avaliação" : "Descrição"} defaultValue={item.descricao} onBlur={(e) => atualizarItem(index, "descricao", e.target.value)} rows={2} />
                {tipo === "avaliacoes" && (
                  <Input placeholder="Nota (ex: 5)" defaultValue={item.nota ?? ""} onBlur={(e) => atualizarItem(index, "nota", e.target.value)} />
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removerItem(index)}>
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
            <Plus className="h-3.5 w-3.5" />Adicionar item
          </Button>
        </div>
      );

    default:
      return null;
  }
}
