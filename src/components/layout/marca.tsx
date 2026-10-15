/** Marca do sistema no topo da navegação. */
export function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-[13px] font-semibold text-background" aria-hidden>
        N
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">Neotec OS</span>
    </div>
  );
}
