"use client";

import Script from "next/script";
import { META_PIXEL_ID, metaPixelHabilitado } from "@/lib/meta-pixel";

/**
 * Script base do Meta Pixel (Fase 262) — monta uma única vez, no
 * layout público da loja, ao lado do `LojaTrackingProvider`. Fica
 * fora quando não há `NEXT_PUBLIC_META_PIXEL_ID` configurado (conta
 * ainda sem Pixel criado no Business Manager) ou em desenvolvimento,
 * pra nunca mandar PageView de localhost pro Events Manager de
 * verdade.
 */
export function MetaPixelScript() {
  if (!metaPixelHabilitado()) return null;

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
