"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJIS_COMUNS = [
  "😀", "😂", "😊", "😍", "🥰", "😉", "😅", "🤔", "😢", "😭",
  "👍", "👎", "🙏", "👏", "💪", "🤝", "✅", "❌", "⚠️", "🔥",
  "❤️", "💙", "💚", "💛", "⭐", "🎉", "📱", "💰", "📦", "🔧",
];

/** Sem dependência de biblioteca de popover nova — controle de abrir/fechar todo local, com clique fora fechando. */
export function SeletorEmoji({ onSelecionar }: { onSelecionar: (emoji: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="ghost" size="icon" title="Emoji" onClick={() => setAberto((v) => !v)}>
        <Smile className="h-4 w-4 text-muted-foreground" />
      </Button>

      {aberto && (
        <div className={cn("absolute bottom-full left-0 z-50 mb-2 w-64 animate-fade-in rounded-card border border-border bg-card p-2 shadow-popover")}>
          <div className="grid grid-cols-6 gap-1">
            {EMOJIS_COMUNS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-md p-1.5 text-lg transition-colors hover:bg-secondary"
                onClick={() => { onSelecionar(emoji); setAberto(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
