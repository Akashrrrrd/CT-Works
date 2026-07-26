"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { FieldRule, ValidationIssue } from "@/lib/engine/validation"
import { UNIT_LABEL } from "@/lib/engine/units"
import { cn } from "@/lib/utils"

function unit(u: string) {
  return UNIT_LABEL[u as keyof typeof UNIT_LABEL] ?? ""
}

export function ParamForm({
  fields,
  values,
  issues = [],
  onChange,
}: {
  fields: FieldRule[]
  values: Record<string, number>
  issues?: ValidationIssue[]
  onChange: (key: string, value: number) => void
}) {
  const issueMap = new Map(issues.map((i) => [i.field, i]))
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => {
        const issue = issueMap.get(field.key)
        const u = unit(field.unit)
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={field.key} className="text-xs text-muted-foreground">
              {field.label}
              {u ? <span className="ml-1 font-mono opacity-70">({u})</span> : null}
            </Label>
            <Input
              id={field.key}
              type="number"
              inputMode="decimal"
              step="any"
              className={cn(
                "font-mono text-sm",
                issue?.severity === "error" && "border-destructive focus-visible:ring-destructive/40",
              )}
              value={Number.isFinite(values[field.key]) ? values[field.key] : ""}
              onChange={(e) => onChange(field.key, e.target.value === "" ? Number.NaN : Number(e.target.value))}
            />
            {issue ? (
              <p
                className={cn(
                  "text-xs",
                  issue.severity === "error" ? "text-destructive" : "text-warning",
                )}
              >
                {issue.message}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
