"use client"

import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TraceBlock } from "@/components/trace-steps"
import { formatNumber } from "@/lib/engine/units"
import type { WiringResult, FaultStudyResult } from "@/lib/engine/results"

export function SharedResults({
  ctWiring,
  vtWiring,
  fault,
}: {
  ctWiring: WiringResult | null
  vtWiring: WiringResult | null
  fault: FaultStudyResult | null
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {ctWiring ? (
          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-sm font-semibold">CT secondary wiring</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="R at 75°C" value={`${formatNumber(ctWiring.r75)} Ω/m`} />
              <Metric label="Lead resistance" value={`${formatNumber(ctWiring.rLead)} Ω`} />
              <Metric label="Lead burden" value={`${formatNumber(ctWiring.va)} VA`} />
            </dl>
            <TraceBlock title="CT wiring derivation" steps={ctWiring.steps} />
          </Card>
        ) : null}

        {vtWiring ? (
          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-sm font-semibold">VT secondary wiring</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="R at 75°C" value={`${formatNumber(vtWiring.r75)} Ω/m`} />
              <Metric label="Lead resistance" value={`${formatNumber(vtWiring.rLead)} Ω`} />
            </dl>
            <TraceBlock title="VT wiring derivation" steps={vtWiring.steps} />
          </Card>
        ) : null}
      </div>

      {fault ? (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">System fault study</h3>
            <p className="text-xs text-muted-foreground">
              Zs = {formatNumber(fault.sourceMagnitude)} Ω ∠{formatNumber(fault.angleDeg)}° · SIR ={" "}
              {formatNumber(fault.sir)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fault case</TableHead>
                  <TableHead className="text-right">|Z| (Ω)</TableHead>
                  <TableHead className="text-right">X/R</TableHead>
                  <TableHead className="text-right">Fault current (A)</TableHead>
                  <TableHead className="text-right">Tp (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fault.cases.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium">{c.label}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(c.magnitude)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(c.xr)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(c.current)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(c.tpMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TraceBlock title="Fault-study derivation" steps={fault.steps} />
        </Card>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/60 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium">{value}</dd>
    </div>
  )
}
