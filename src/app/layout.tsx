import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Sora, IBM_Plex_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Sora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Neotec OS",
  description: "Central de operações da Neotec Araguari",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
