"use client"

import { useCallback, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Calculator, CheckCircle2, Plus, Trash2, XCircle } from "lucide-react"
import type { RED670Input, RED670Result } from "@/lib/services/red670-calculations"

/* Nothing here is a calculation constant - these are only the starting values
   shown in the form. Every field is editable and every change re-runs the
   engine, which derives all dependent values from scratch. */
const INITIAL_INPUT: RED670Input = {
  system: { bus_fault_level_ka: 31.5, system_frequency_hz: 50, bus_voltage_kv: 33, xr_ratio: 40, voltage_pu: 1 },
  line: {
    positive_sequence_resistance: 0.0221,
    positive_sequence_reactance: 0.16,
    zero_sequence_resistance: 0.13,
    zero_sequence_reactance: 0.06,
    route_length_km: 0.2,
    cables_per_phase: 1,
  },
  ct_wiring: { conductor_cross_section_mm2: 2.5, resistance_per_km_at_20c: 7.41, lead_length_m: 150 },
  vt_wiring: { conductor_cross_section_mm2: 2.5, resistance_per_km_at_20c: 7.41, lead_length_m: 150 },
  relay_rated_current: 1,
  ct_taps: [
    {
      name: "Tap-1",
      ct_ratio_primary: 2500,
      ct_ratio_secondary: 1,
      class_of_accuracy: "PX-A",
      ct_resistance_ohm: 5,
      knee_point_voltage_v: 3750,
      magnetizing_current_ma: 60,
    },
    {
      name: "Tap-2",
      ct_ratio_primary: 1500,
      ct_ratio_secondary: 1,
      class_of_accuracy: "PX-A",
      ct_resistance_ohm: 3,
      knee_point_voltage_v: 200,
      magnetizing_current_ma: 100,
    },
  ],
  device_burdens: [{ name: "RED670", burden_va: 0.02, is_protected_relay: true }],
}

const n = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "-")

function NumberField({
  label,
  unit,
  value,
  step = "any",
  onChange,
}: {
  label: string
  unit?: string
  value: number | undefined
  step?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs leading-relaxed text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value as number) ? String(value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
        className="font-mono"
      />
    </div>
  )
}

export function RED670Calculator() {
  const [input, setInput] = useState<RED670Input>(INITIAL_INPUT)
  const [result, setResult] = useState<RED670Result | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [openTrace, setOpenTrace] = useState(false)

  const patch = useCallback(<K extends keyof RED670Input>(key: K, value: RED670Input[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
    setResult(null)
  }, [])

  const patchSection = useCallback(
    <K extends "system" | "line" | "ct_wiring" | "vt_wiring">(section: K, field: string, value: number) => {
      setInput((prev) => ({ ...prev, [section]: { ...(prev[section] as object), [field]: value } }) as RED670Input)
      setResult(null)
    },
    [],
  )

  const patchTap = useCallback((index: number, field: string, value: number | string) => {
    setInput((prev) => {
      const taps = prev.ct_taps.map((t, i) => (i === index ? { ...t, [field]: value } : t))
      return { ...prev, ct_taps: taps }
    })
    setResult(null)
  }, [])

  const calculate = useCallback(async () => {
    setLoading(true)
    setErrors([])
    try {
      const res = await fetch("/api/relay-formulas/red670", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) {
        const list: string[] = Array.isArray(data.validation_errors)
          ? data.validation_errors.map((e: { path: string; message: string }) => `${e.path}: ${e.message}`)
          : [data.details ?? data.error ?? "Calculation failed"]
        setErrors(list)
        setResult(null)
        return
      }
      setResult(data as RED670Result)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Network error"])
    } finally {
      setLoading(false)
    }
  }, [input])

  const suitable = result?.final_verdict === "Suitably Dimensioned"

  const faultRows = useMemo(() => {
    if (!result) return []
    const f = result.system.faults
    return [
      { label: "Close-in fault (max bus fault current)", current: result.summary.ikmax_a, tp: result.system.system_time_constant_ms, xr: input.system.xr_ratio },
      { label: "3-ph through fault", current: f.through_3ph.current_a, tp: f.through_3ph.time_constant_ms, xr: f.through_3ph.xr_ratio },
      { label: "1-ph to earth through fault", current: f.through_1ph.current_a, tp: f.through_1ph.time_constant_ms, xr: f.through_1ph.xr_ratio },
      { label: "3-ph endzone-1 fault (80%)", current: f.endzone1_3ph.current_a, tp: f.endzone1_3ph.time_constant_ms, xr: f.endzone1_3ph.xr_ratio },
      { label: "1-ph endzone-1 fault (80%)", current: f.endzone1_1ph.current_a, tp: f.endzone1_1ph.time_constant_ms, xr: f.endzone1_1ph.xr_ratio },
    ]
  }, [result, input.system.xr_ratio])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">RED670 CT Adequacy Engine</CardTitle>
              <CardDescription className="leading-relaxed">
                Line differential + distance protection. Every value is derived from the inputs below using the
                formula chain transcribed from the reference workbook.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Ealreq / Vk method</Badge>
              <Badge variant="outline">Excel parity verified</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System parameters</CardTitle>
            <CardDescription>Received per substation</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField label="Bus fault level" unit="kA" value={input.system.bus_fault_level_ka} onChange={(v) => patchSection("system", "bus_fault_level_ka", v)} />
            <NumberField label="System frequency" unit="Hz" value={input.system.system_frequency_hz} onChange={(v) => patchSection("system", "system_frequency_hz", v)} />
            <NumberField label="Bus voltage level" unit="kV" value={input.system.bus_voltage_kv} onChange={(v) => patchSection("system", "bus_voltage_kv", v)} />
            <NumberField label="X/R ratio" value={input.system.xr_ratio} onChange={(v) => patchSection("system", "xr_ratio", v)} />
            <NumberField label="Voltage considered" unit="pu" value={input.system.voltage_pu} onChange={(v) => patchSection("system", "voltage_pu", v)} />
            <NumberField label="Relay rated current Ir" unit="A" value={input.relay_rated_current} onChange={(v) => patch("relay_rated_current", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line / cable parameters</CardTitle>
            <CardDescription>Common to all IEDs</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField label="Positive seq. resistance R1" unit="Ω/km" value={input.line.positive_sequence_resistance} onChange={(v) => patchSection("line", "positive_sequence_resistance", v)} />
            <NumberField label="Positive seq. reactance X1" unit="Ω/km" value={input.line.positive_sequence_reactance} onChange={(v) => patchSection("line", "positive_sequence_reactance", v)} />
            <NumberField label="Zero seq. resistance R0" unit="Ω/km" value={input.line.zero_sequence_resistance} onChange={(v) => patchSection("line", "zero_sequence_resistance", v)} />
            <NumberField label="Zero seq. reactance X0" unit="Ω/km" value={input.line.zero_sequence_reactance} onChange={(v) => patchSection("line", "zero_sequence_reactance", v)} />
            <NumberField label="Route length" unit="km" value={input.line.route_length_km} onChange={(v) => patchSection("line", "route_length_km", v)} />
            <NumberField label="Cables per phase" value={input.line.cables_per_phase} onChange={(v) => patchSection("line", "cables_per_phase", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CT wiring</CardTitle>
            <CardDescription>Current loop, CT to relay</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField label="Conductor cross section" unit="mm²" value={input.ct_wiring.conductor_cross_section_mm2} onChange={(v) => patchSection("ct_wiring", "conductor_cross_section_mm2", v)} />
            <NumberField label="Resistance at 20 °C" unit="Ω/km" value={input.ct_wiring.resistance_per_km_at_20c} onChange={(v) => patchSection("ct_wiring", "resistance_per_km_at_20c", v)} />
            <NumberField label="Lead length, CT to relay" unit="m" value={input.ct_wiring.lead_length_m} onChange={(v) => patchSection("ct_wiring", "lead_length_m", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">VT wiring</CardTitle>
            <CardDescription>Voltage loop, VT to relay (reported only)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField label="Conductor cross section" unit="mm²" value={input.vt_wiring?.conductor_cross_section_mm2} onChange={(v) => patchSection("vt_wiring", "conductor_cross_section_mm2", v)} />
            <NumberField label="Resistance at 20 °C" unit="Ω/km" value={input.vt_wiring?.resistance_per_km_at_20c} onChange={(v) => patchSection("vt_wiring", "resistance_per_km_at_20c", v)} />
            <NumberField label="Lead length, VT to relay" unit="m" value={input.vt_wiring?.lead_length_m} onChange={(v) => patchSection("vt_wiring", "lead_length_m", v)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">CT taps</CardTitle>
              <CardDescription>Each tap is checked independently against its own Vk</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const last = input.ct_taps[input.ct_taps.length - 1]
                  patch("ct_taps", [...input.ct_taps, { ...last, name: `Tap-${input.ct_taps.length + 1}` }])
                }}
              >
                <Plus className="mr-1 size-4" /> Add tap
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {input.ct_taps.map((tap, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Tap label</Label>
                  <Input value={tap.name ?? ""} onChange={(e) => patchTap(i, "name", e.target.value)} className="max-w-48" />
                </div>
                {input.ct_taps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch("ct_taps", input.ct_taps.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${tap.name ?? `tap ${i + 1}`}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <NumberField label="CT ratio primary Ipn" unit="A" value={tap.ct_ratio_primary} onChange={(v) => patchTap(i, "ct_ratio_primary", v)} />
                <NumberField label="CT ratio secondary Isn" unit="A" value={tap.ct_ratio_secondary} onChange={(v) => patchTap(i, "ct_ratio_secondary", v)} />
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Accuracy class</Label>
                  <Input value={tap.class_of_accuracy ?? ""} onChange={(e) => patchTap(i, "class_of_accuracy", e.target.value)} className="font-mono" />
                </div>
                <NumberField label="CT resistance Rct" unit="Ω" value={tap.ct_resistance_ohm} onChange={(v) => patchTap(i, "ct_resistance_ohm", v)} />
                <NumberField label="Magnetizing current I0" unit="mA" value={tap.magnetizing_current_ma} onChange={(v) => patchTap(i, "magnetizing_current_ma", v)} />
                <NumberField label="Knee point voltage Vk" unit="V" value={tap.knee_point_voltage_v} onChange={(v) => patchTap(i, "knee_point_voltage_v", v)} />
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium">Burdens on the same CT core</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patch("device_burdens", [...input.device_burdens, { name: "Other device", burden_va: 0 }])}
              >
                <Plus className="mr-1 size-4" /> Add device
              </Button>
            </div>
            {input.device_burdens.map((d, i) => (
              <div key={i} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_10rem_auto]">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Device</Label>
                  <Input
                    value={d.name}
                    onChange={(e) =>
                      patch("device_burdens", input.device_burdens.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                </div>
                <NumberField
                  label="Burden"
                  unit="VA"
                  value={d.burden_va}
                  onChange={(v) =>
                    patch("device_burdens", input.device_burdens.map((x, idx) => (idx === i ? { ...x, burden_va: v } : x)))
                  }
                />
                <div className="flex items-center gap-2 pb-2">
                  {d.is_protected_relay ? (
                    <Badge>Sr in bracket</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => patch("device_burdens", input.device_burdens.filter((_, idx) => idx !== i))}
                      aria-label={`Remove ${d.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={calculate} disabled={loading} size="lg" className="min-w-56">
          <Calculator className="mr-2 size-4" />
          {loading ? "Calculating..." : "Calculate CT adequacy"}
        </Button>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Input rejected</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {suitable ? (
                  <CheckCircle2 className="size-6 text-primary" />
                ) : (
                  <XCircle className="size-6 text-destructive" />
                )}
                <div>
                  <CardTitle className="text-lg">{result.final_verdict}</CardTitle>
                  <CardDescription>
                    {result.recommended_tap ? `Recommended tap: ${result.recommended_tap}` : "No tap evaluated"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Metric label="Rl (lead + other)" value={`${n(result.summary.rl_ohm, 6)} Ω`} />
              <Metric label="System tp" value={`${n(result.summary.system_time_constant_ms, 2)} ms`} />
              <Metric label="SIR" value={n(result.summary.sir, 3)} />
              <Metric label="2RL loop resistance" value={`${n(result.ct_wiring.loop_lead_resistance_ohm, 6)} Ω`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fault currents and time constants</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Current (A)</TableHead>
                    <TableHead className="text-right">X/R</TableHead>
                    <TableHead className="text-right">tp (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faultRows.map((r) => (
                    <TableRow key={r.label}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell className="text-right font-mono">{n(r.current, 2)}</TableCell>
                      <TableCell className="text-right font-mono">{n(r.xr, 3)}</TableCell>
                      <TableCell className="text-right font-mono">{n(r.tp, 2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {result.taps.map((tap) => (
              <Card key={tap.name} className={tap.name === result.recommended_tap ? "border-primary" : undefined}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {tap.name} — {tap.ct_ratio_primary}/{tap.ct_ratio_secondary} A
                    </CardTitle>
                    <Badge variant={tap.suitable ? "default" : "destructive"}>{tap.verdict}</Badge>
                  </div>
                  <CardDescription>
                    Rct {tap.ct_resistance_ohm} Ω · Rl {n(tap.rl_ohm, 6)} Ω · bracket {n(tap.total_secondary_burden_ohm, 6)} Ω
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Factor</TableHead>
                        <TableHead className="text-right">Ealreq (V)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tap.checks.map((c) => {
                        const isMax = c.ealreq_v === tap.highest_ealreq_v
                        return (
                          <TableRow key={c.key} className={isMax ? "bg-muted" : undefined}>
                            <TableCell className="leading-relaxed">
                              <span className="text-muted-foreground">{c.function_group}</span> — {c.label}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {c.current_multiplier === 2 ? "2 × " : ""}
                              {c.dc_factor !== 1 ? `×${c.dc_factor}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">{n(c.ealreq_v, 3)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  <div className="grid grid-cols-2 gap-4">
                    <Metric label="Highest Ealreq" value={`${n(tap.highest_ealreq_v, 3)} V`} />
                    <Metric label="Vk required = Ealreq × 0.8" value={`${n(tap.knee_point_voltage_required_v, 3)} V`} />
                    <Metric label="Vk available" value={`${tap.knee_point_voltage_available_v} V`} />
                    <Metric
                      label="Margin"
                      value={`${tap.margin_percent >= 0 ? "+" : ""}${n(tap.margin_percent, 1)} %`}
                    />
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">Controlling: {tap.controlling_case}</p>
                  <ul className="flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
                    {tap.remarks.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Formula traceability</CardTitle>
                  <CardDescription>Every intermediate step with its source cell</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenTrace((v) => !v)}>
                  {openTrace ? "Hide" : "Show"} steps
                </Button>
              </div>
            </CardHeader>
            {openTrace && (
              <CardContent className="flex flex-col gap-6">
                <TraceTable title="CT wiring" steps={result.ct_wiring.trace} />
                {result.vt_wiring && <TraceTable title="VT wiring" steps={result.vt_wiring.trace} />}
                <TraceTable title="Burdens" steps={result.burdens.trace} />
                <TraceTable title="Source and line" steps={result.system.trace} />
                <TraceTable title="3-ph through fault" steps={result.system.faults.through_3ph.trace} />
                <TraceTable title="1-ph through fault" steps={result.system.faults.through_1ph.trace} />
                <TraceTable title="3-ph endzone-1 fault" steps={result.system.faults.endzone1_3ph.trace} />
                <TraceTable title="1-ph endzone-1 fault" steps={result.system.faults.endzone1_1ph.trace} />
                {result.taps.map((t) => (
                  <TraceTable key={t.name} title={t.name} steps={t.trace} />
                ))}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
      <span className="text-xs leading-relaxed text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  )
}

function TraceTable({ title, steps }: { title: string; steps: RED670Result["ct_wiring"]["trace"] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Formula</TableHead>
              <TableHead>Substitution</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((s, i) => (
              <TableRow key={`${s.reference}-${i}`}>
                <TableCell className="leading-relaxed">{s.label}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.reference}</TableCell>
                <TableCell className="font-mono text-xs">{s.formula}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.substitution}</TableCell>
                <TableCell className="whitespace-nowrap text-right font-mono">
                  {n(s.value, 6)} {s.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
