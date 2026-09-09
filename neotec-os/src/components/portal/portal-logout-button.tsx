"use client";

import { LogOut } from "lucide-react";
import { portalLogoutAction } from "@/services/portal/portal.actions";

export function PortalLogoutButton() {
  return (
    <button type="button" onClick={() => void portalLogoutAction()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-danger">
      <LogOut className="h-3.5 w-3.5" />Sair
    </button>
  );
}
