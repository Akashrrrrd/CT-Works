"use client"

import { Trash2, Cpu } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ParamForm } from "@/components/param-form"
import { VerdictBadge } from "@/components/verdict-badge"
import { TraceBlock } from "@/components/trace-steps"
import { getTemplate } from "@/lib/engine/templates"
import { formatNumber, UNIT_LABEL } from "@/lib/engine/units"
import type { IedInstance } from "@/lib/engine/model"
import type { IedEvaluation } from "@/lib/engine/calc-engine"

function unit(u: string) {
  return UNIT_LABEL[u as keyof typeof UNIT_LABEL] ?? ""
}

export function IedCard({
  ied,
  evaluation,
  onChangeParam,
  onDelete,
}: {
  ied: IedInstance
  evaluation: IedEvaluation | undefined
  onChangeParam: (key: string, value: number) => void
  onDelete: () => void
}) {
  const template = getTemplate(ied.templateId)
  const adequacy = evaluation?.adequacy ?? null

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Cpu className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{ied.name}</p>
            <p className="text-xs text-muted-foreground">
              {template.manufacturer} · {template.family}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {adequacy ? <VerdictBadge verdict={adequacy.verdict} /> : null}
          <button
            type="button"
            aria-label={`Remove ${ied.name}`}
            onClick={onDelete}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <ParamForm
        fields={template.fields}
        values={ied.params}
        issues={evaluation?.issues ?? []}
        onChange={onChangeParam}
      />

      {adequacy ? (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultStat
                label={adequacy.requiredLabel}
                value={formatNumber(adequacy.requiredVk)}
                unit={unit("V")}
              />
              <ResultStat
                label={adequacy.availableLabel}
                value={formatNumber(adequacy.availableVk)}
                unit={unit("V")}
                good={adequacy.verdict === "suitable"}
              />
            </div>

            {adequacy.metrics.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {adequacy.metrics.map((m) => (
                  <div key={m.label} className="rounded-md bg-secondary/60 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    <p className="font-mono text-sm font-medium">
                      {formatNumber(m.value)} <span className="text-xs text-muted-foreground">{unit(m.unit)}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              {adequacy.functions.map((fn) => (
                <TraceBlock key={fn.key} title={`${fn.label} — Ealreq = ${formatNumber(fn.ealReq)} V`} steps={fn.steps} />
              ))}
              <TraceBlock title="Adequacy summary" steps={adequacy.steps} />
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-warning">Resolve input errors to run the adequacy check.</p>
      )}
    </Card>
  )
}

function ResultStat({
  label,
  value,
  unit,
  good,
}: {
  label: string
  value: string
  unit: string
  good?: boolean
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground text-pretty">{label}</p>
      <p className={`font-mono text-lg font-semibold ${good ? "text-success" : ""}`}>
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
