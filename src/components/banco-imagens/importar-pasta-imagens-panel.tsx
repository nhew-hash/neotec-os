"use client";

import { useState, useRef } from "react";
import { FolderOpen, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { identificarPastaAction, importarPastaImagensAction } from "@/services/banco-imagens/banco-imagens.actions";
import type { IdentificacaoPasta } from "@/services/banco-imagens/banco-imagens-ia.service";
import type { GrupoImagem } from "@/services/banco-imagens/banco-imagens.service";

// Input de pasta é um recurso de navegador sem tipagem oficial no DOM padrão do React.
type InputComPasta = HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean };

export function ImportarPastaImagensPanel() {
  const inputRef = useRef<InputComPasta>(null);
  const [etapa, setEtapa] = useState<"ocioso" | "identificando" | "confirmando" | "importando" | "concluido">("ocioso");
  const [nomePasta, setNomePasta] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [identificacao, setIdentificacao] = useState<IdentificacaoPasta | null>(null);
  const [grupoExistente, setGrupoExistente] = useState<GrupoImagem | null>(null);
  const [resultado, setResultado] = useState<{ produtosVinculados: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handlePastaSelecionada(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setErro(null);

    const arquivosImagem = Array.from(fileList)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); // "1.jpg" antes de "2.jpg" antes de "10.jpg"

    if (arquivosImagem.length === 0) return setErro("Nenhuma imagem (JPG/PNG/WEBP) encontrada nessa pasta");

    // O caminho relativo vem como "iPhone 13 Branco/1.jpg" — o primeiro pedaço é o nome da pasta.
    const primeiroArquivo = arquivosImagem[0] as File & { webkitRelativePath?: string };
    const nome = primeiroArquivo.webkitRelativePath?.split("/")[0] ?? "";
    if (!nome) return setErro("Não consegui identificar o nome da pasta — o navegador pode não suportar seleção de pasta");

    setNomePasta(nome);
    setArquivos(arquivosImagem);
    setEtapa("identificando");

    const result = await identificarPastaAction(nome);
    if (!result.success) {
      setErro(result.error);
      setEtapa("ocioso");
      return;
    }

    setIdentificacao(result.data.identificacao);
    setGrupoExistente(result.data.grupoExistente);
    setEtapa("confirmando");
  }

  async function handleConfirmar(substituir: boolean) {
    if (!identificacao) return;
    setEtapa("importando");
    setErro(null);

    const formData = new FormData();
    formData.set("identificacao", JSON.stringify(identificacao));
    formData.set("substituir", String(substituir));
    arquivos.forEach((a) => formData.append("arquivos", a));

    const result = await importarPastaImagensAction(formData);
    if (!result.success) {
      setErro(result.error);
      setEtapa("confirmando");
      return;
    }

    setResultado({ produtosVinculados: result.data.produtosVinculados });
    setEtapa("concluido");
  }

  function handleReiniciar() {
    setEtapa("ocioso");
    setNomePasta("");
    setArquivos([]);
    setIdentificacao(null);
    setGrupoExistente(null);
    setResultado(null);
    setErro(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Importar pasta de imagens</p>
          <p className="text-xs text-muted-foreground">Nomeia a pasta como "Modelo Cor" (ex: "iPhone 13 Branco") — a IA identifica e vincula sozinha aos produtos correspondentes.</p>
        </div>

        {etapa === "ocioso" && (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-primary/40 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5">
            <FolderOpen className="h-4 w-4" />Selecionar Pasta
            <input
              ref={inputRef}
              type="file"
              // @ts-expect-error webkitdirectory não é reconhecido pelos tipos padrão do input HTML no React/TS
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => handlePastaSelecionada(e.target.files)}
            />
          </label>
        )}

        {etapa === "identificando" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Identificando "{nomePasta}"...
          </div>
        )}

        {etapa === "confirmando" && identificacao && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm text-foreground">
              <strong>{arquivos.length} imagem(ns)</strong> em "{nomePasta}" — identificado como:
            </p>
            <p className="font-mono text-sm text-primary">
              {identificacao.marca} → {identificacao.modelo}{identificacao.cor && ` → ${identificacao.cor}`}{identificacao.armazenamento && ` → ${identificacao.armazenamento}`}
            </p>

            {grupoExistente ? (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <span>Encontrado grupo já existente com {grupoExistente.totalFotos} foto(s). Substituir pelas novas, ou adicionar essas junto das que já existem?</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum grupo existente pra essa combinação — vai criar um novo.</p>
            )}

            {erro && <p className="text-xs text-danger">{erro}</p>}

            <div className="flex gap-2">
              {grupoExistente ? (
                <>
                  <Button size="sm" onClick={() => handleConfirmar(true)}>Sim, substituir</Button>
                  <Button size="sm" variant="outline" onClick={() => handleConfirmar(false)}>Não, adicionar às existentes</Button>
                </>
              ) : (
                <Button size="sm" onClick={() => handleConfirmar(true)}>Confirmar e importar</Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleReiniciar}>Cancelar</Button>
            </div>
          </div>
        )}

        {etapa === "importando" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Importando {arquivos.length} imagem(ns)...
          </div>
        )}

        {etapa === "concluido" && resultado && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" />Importado — {resultado.produtosVinculados} produto(s) vinculado(s) automaticamente.
            </p>
            <Button size="sm" variant="outline" onClick={handleReiniciar} className="w-fit">Importar outra pasta</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
