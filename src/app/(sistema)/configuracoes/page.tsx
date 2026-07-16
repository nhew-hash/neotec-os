import Link from "next/link";
import { MessageCircle, Users, Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

const ITENS = [
  {
    href: "/configuracoes/integracoes/whatsapp",
    titulo: "Integração WhatsApp",
    descricao: "Meta Cloud API ou WhatsApp Web (QR Code)",
    icon: MessageCircle,
    disponivel: true,
  },
  {
    href: "#",
    titulo: "Usuários e permissões",
    descricao: "Em construção",
    icon: Users,
    disponivel: false,
  },
  {
    href: "#",
    titulo: "Preferências do sistema",
    descricao: "Em construção",
    icon: SettingsIcon,
    disponivel: false,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" description="Integrações, usuários e preferências do sistema" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITENS.map((item) => (
          <Link key={item.titulo} href={item.disponivel ? item.href : "#"} className={!item.disponivel ? "pointer-events-none" : ""}>
            <Card className={!item.disponivel ? "opacity-50" : "transition-shadow hover:shadow-card-hover"}>
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <item.icon className="h-[18px] w-[18px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{item.titulo}</span>
                  <span className="text-xs text-muted-foreground">{item.descricao}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
