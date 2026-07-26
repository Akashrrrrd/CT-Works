"use client"

import { Card } from "@/components/ui/card"
import { ParamForm } from "@/components/param-form"
import { SYSTEM_FIELDS, type SystemParams } from "@/lib/engine/model"
import { validateSystem } from "@/lib/engine/calc-engine"

export function SystemPanel({
  system,
  onChange,
}: {
  system: SystemParams
  onChange: (next: SystemParams) => void
}) {
  const issues = validateSystem(system)
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          System &amp; line parameters
        </h2>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          Study-wide source and power-line data. Reused by every bay and IED — entered once.
        </p>
      </div>
      <ParamForm
        fields={SYSTEM_FIELDS}
        values={system as unknown as Record<string, number>}
        issues={issues}
        onChange={(key, value) => onChange({ ...system, [key]: value })}
      />
    </Card>
  )
}
