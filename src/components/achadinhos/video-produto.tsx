"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { VideoIncorporavel } from "@/lib/achadinhos/apresentacao";

/**
 * Vídeo do produto. YouTube só carrega o player (e os scripts do Google)
 * quando a pessoa clica em reproduzir — antes disso é só a miniatura, o que
 * mantém a página leve. Arquivo mp4 não baixa nada até o play (`preload="none"`).
 */
export function VideoProduto({ video, titulo }: { video: VideoIncorporavel; titulo: string }) {
  const [ativo, setAtivo] = useState(false);

  if (video.tipo === "link") {
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-achados-navy ring-1 ring-achados-line hover:ring-achados-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Play className="h-4 w-4" aria-hidden /> Assistir ao vídeo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }

  if (video.tipo === "arquivo") {
    return (
      <video controls preload="none" playsInline className="aspect-video w-full rounded-3xl bg-achados-navy ring-1 ring-achados-line" aria-label={`Vídeo: ${titulo}`}>
        <source src={video.url} />
        Seu navegador não reproduz este vídeo.
      </video>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-achados-navy ring-1 ring-achados-line">
      {ativo ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          title={`Vídeo: ${titulo}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAtivo(true)}
          aria-label={`Reproduzir vídeo: ${titulo}`}
          className="group absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-achados-lime text-achados-navy shadow-lg">
            <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
