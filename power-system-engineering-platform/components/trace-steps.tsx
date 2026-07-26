"use client"

import { useState } from "react"
import { ChevronRight, FileSpreadsheet, BookMarked, Wrench, User } from "lucide-react"
import type { TraceStep, FormulaSource } from "@/lib/engine/formula"
import { UNIT_LABEL, formatNumber } from "@/lib/engine/units"
import { cn } from "@/lib/utils"

function sourceMeta(source: FormulaSource) {
  switch (source.kind) {
    case "excel-template":
      return { icon: FileSpreadsheet, label: `Template: ${source.ref}` }
    case "iec":
      return { icon: BookMarked, label: `IEC: ${source.ref}` }
    case "manufacturer":
      return { icon: Wrench, label: `Mfr: ${source.ref}` }
    default:
      return { icon: User, label: `Engineer: ${source.ref}` }
  }
}

function unit(u: string) {
  return UNIT_LABEL[u as keyof typeof UNIT_LABEL] ?? ""
}

export function TraceStepRow({ step }: { step: TraceStep }) {
  const meta = sourceMeta(step.source)
  const Icon = meta.icon
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-card-foreground text-pretty">{step.label}</p>
          <code className="mt-0.5 block font-mono text-xs text-muted-foreground">{step.expression}</code>
        </div>
        <span className="shrink-0 rounded bg-secondary px-2 py-1 font-mono text-xs font-semibold text-secondary-foreground">
          {formatNumber(step.output.value)} {unit(step.output.unit)}
        </span>
      </div>
      <code className="mt-2 block break-words font-mono text-xs text-foreground/80">{step.substitution}</code>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{meta.label}</span>
        <span className="ml-auto shrink-0 font-mono opacity-60">{step.formulaId}</span>
      </div>
    </div>
  )
}

export function TraceBlock({
  title,
  steps,
  defaultOpen = false,
}: {
  title: string
  steps: TraceStep[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (steps.length === 0) return null
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
        <span className="text-sm font-medium">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{steps.length} steps</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          {steps.map((step, i) => (
            <TraceStepRow key={`${step.formulaId}-${i}`} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}
