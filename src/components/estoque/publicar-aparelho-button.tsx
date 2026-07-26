"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alternarPublicacaoLojaAparelhoAction } from "@/services/estoque/estoque.actions";

export function PublicarAparelhoButton({ aparelhoId, publicado }: { aparelhoId: string; publicado: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await alternarPublicacaoLojaAparelhoAction(aparelhoId, !publicado);
      router.refresh();
    });
  }

  return (
    <Button variant={publicado ? "outline" : "ghost"} size="sm" onClick={handleClick} disabled={isPending}>
      <Store className="h-3.5 w-3.5" />{publicado ? "Na loja" : "Publicar"}
    </Button>
  );
}
