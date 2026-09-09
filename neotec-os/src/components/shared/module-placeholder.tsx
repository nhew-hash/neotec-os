import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ModulePlaceholderProps {
  titulo: string;
  descricao: string;
  icon: LucideIcon;
}

/**
 * Estado vazio reutilizável para módulos cuja arquitetura já existe
 * (rota, service e components reservados) mas cuja funcionalidade ainda
 * será construída em sprint futura. Evita duplicar essa marcação em
 * cada página placeholder.
 */
export function ModulePlaceholder({ titulo, descricao, icon: Icon }: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <p className="font-display text-sm font-medium text-foreground">
            Módulo em construção
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            A arquitetura deste módulo já está pronta para receber as próximas sprints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
