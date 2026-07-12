import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function ConfiguracoesPage() {
  return (
    <ModulePlaceholder
      titulo="Configurações"
      descricao="Usuários, permissões e preferências do sistema"
      icon={Settings}
    />
  );
}
