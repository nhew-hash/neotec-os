"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40 animate-in fade-in-0", className)}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-0 shadow-popover transition ease-in-out animate-in",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 h-full w-80 border-r border-border slide-in-from-left",
        right: "inset-y-0 right-0 h-full w-80 border-l border-border slide-in-from-right",
        // Menu de baixo para cima (estilo "anexar" do WhatsApp no celular).
        bottom: "inset-x-0 bottom-0 w-full border-t border-border slide-in-from-bottom",
      },
    },
    defaultVariants: { side: "left" },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "left", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {/* App instalado no iPhone ocupa a tela toda: painel lateral começa abaixo do relógio
          (antes o título ficava embaixo da barra de status e aparecia embaçado). */}
      {side !== "bottom" && <div aria-hidden className="h-[env(safe-area-inset-top)] shrink-0" />}
      {children}
      {side === "bottom" && <div aria-hidden className="h-[env(safe-area-inset-bottom)] shrink-0" />}
      <DialogPrimitive.Close className={cn("absolute right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100", side === "bottom" ? "top-4" : "top-[calc(1rem+env(safe-area-inset-top))]")}>
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

/** Título do painel — obrigatório para leitores de tela (o Radix avisa sem ele). Use `className="sr-only"` se não quiser exibi-lo. */
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle };
