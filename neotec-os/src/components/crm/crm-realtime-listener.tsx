"use client";

import { useCrmRealtime } from "@/hooks/use-crm-realtime";

/** Não renderiza nada — só liga a assinatura de tempo real do CRM. */
export function CrmRealtimeListener() {
  useCrmRealtime();
  return null;
}
