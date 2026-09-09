"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Wrench, ShoppingBag, Gift, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/portal/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/portal/ordens", label: "Ordens", icon: Wrench },
  { href: "/portal/compras", label: "Compras", icon: ShoppingBag },
  { href: "/portal/cashback", label: "Cashback", icon: Gift },
  { href: "/portal/perfil", label: "Perfil", icon: User },
];

export function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed inset-x-0 bottom-0 flex h-16 items-stretch border-t border-border bg-card">
      {ITENS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
