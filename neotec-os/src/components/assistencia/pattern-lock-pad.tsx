"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const GRID = 3;
const SIZE = 220;
const PADDING = 36;
const STEP = (SIZE - PADDING * 2) / (GRID - 1);

function posicaoDoNo(indice: number): { x: number; y: number } {
  const linha = Math.floor(indice / GRID);
  const coluna = indice % GRID;
  return { x: PADDING + coluna * STEP, y: PADDING + linha * STEP };
}

interface PatternLockPadProps {
  value?: string; // "1,4,7,8,9" — índices 1-based, na ordem do traço
  onChange: (value: string) => void;
  readOnly?: boolean;
}

/**
 * Grade de 9 pontos onde o funcionário reproduz o padrão de desenho que
 * o cliente informou verbalmente — é só um registro de referência pro
 * técnico usar depois, não trava nem valida nada de verdade.
 */
export function PatternLockPad({ value, onChange, readOnly = false }: PatternLockPadProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sequencia, setSequencia] = useState<number[]>(
    value ? value.split(",").map((n) => Number(n) - 1).filter((n) => !Number.isNaN(n)) : []
  );
  const [arrastando, setArrastando] = useState(false);

  const commit = useCallback((seq: number[]) => {
    onChange(seq.map((n) => n + 1).join(","));
  }, [onChange]);

  function noMaisProximo(clientX: number, clientY: number): number | null {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE;
    const y = ((clientY - rect.top) / rect.height) * SIZE;

    for (let i = 0; i < GRID * GRID; i++) {
      const pos = posicaoDoNo(i);
      const dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < STEP * 0.4) return i;
    }
    return null;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (readOnly) return;
    const no = noMaisProximo(e.clientX, e.clientY);
    if (no === null) return;
    setArrastando(true);
    setSequencia([no]);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (readOnly || !arrastando) return;
    const no = noMaisProximo(e.clientX, e.clientY);
    if (no === null) return;
    setSequencia((prev) => (prev.includes(no) ? prev : [...prev, no]));
  }

  function handlePointerUp() {
    if (readOnly || !arrastando) return;
    setArrastando(false);
    commit(sequencia);
  }

  function limpar() {
    setSequencia([]);
    onChange("");
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={cn("touch-none select-none rounded-md border border-border bg-secondary/40", !readOnly && "cursor-pointer")}
        style={{ width: 180, height: 180 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {sequencia.slice(1).map((no, i) => {
          const de = posicaoDoNo(sequencia[i]);
          const ate = posicaoDoNo(no);
          return (
            <line
              key={`${sequencia[i]}-${no}`}
              x1={de.x} y1={de.y} x2={ate.x} y2={ate.y}
              stroke="hsl(var(--primary))" strokeWidth={4} strokeLinecap="round"
            />
          );
        })}

        {Array.from({ length: GRID * GRID }).map((_, i) => {
          const pos = posicaoDoNo(i);
          const ativo = sequencia.includes(i);
          return (
            <circle
              key={i}
              cx={pos.x} cy={pos.y} r={10}
              className={ativo ? "fill-primary" : "fill-border"}
            />
          );
        })}
      </svg>

      {!readOnly && (
        <Button type="button" variant="ghost" size="sm" onClick={limpar}>
          Limpar
        </Button>
      )}
    </div>
  );
}
