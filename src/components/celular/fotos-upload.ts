"use client";

import { createClient } from "@/lib/supabase/client";
import { pastaDoContexto, type ContextoCaptura } from "@/services/celular/captura";

const LADO_MAXIMO = 1600;

/** Reduz a foto da câmera (12 MP vira ~300 KB) antes de subir — economiza dados do celular. */
async function reduzir(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) throw new Error("O arquivo não é uma imagem.");
  const bitmap = await createImageBitmap(arquivo).catch(() => null);
  if (!bitmap) return arquivo; // formato que o navegador não decodifica (ex.: HEIC no Android): sobe como veio
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return arquivo;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? arquivo), "image/jpeg", 0.82));
}

function nomeArquivo(): string {
  const aleatorio = crypto.getRandomValues(new Uint8Array(6));
  return `${Date.now().toString(36)}-${Array.from(aleatorio, (b) => b.toString(16).padStart(2, "0")).join("")}.jpg`;
}

/**
 * Sobe as fotos para o bucket privado os-fotos, na pasta do registro.
 * Devolve os caminhos que subiram; se alguma falhar, lança com a mensagem
 * (as que já subiram ficam em `parciais` para não perder o trabalho).
 */
export async function subirFotos(arquivos: File[], contexto: ContextoCaptura, contextoId: string, aoProgredir?: (feitas: number) => void): Promise<string[]> {
  const supabase = createClient();
  const caminhos: string[] = [];
  for (const arquivo of arquivos) {
    const blob = await reduzir(arquivo);
    const caminho = `${pastaDoContexto(contexto, contextoId)}/${nomeArquivo()}`;
    const { error } = await supabase.storage.from("os-fotos").upload(caminho, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    if (error) {
      const e = new Error(`Falha ao enviar a foto ${caminhos.length + 1}: ${error.message}`) as Error & { parciais?: string[] };
      e.parciais = caminhos;
      throw e;
    }
    caminhos.push(caminho);
    aoProgredir?.(caminhos.length);
  }
  return caminhos;
}
