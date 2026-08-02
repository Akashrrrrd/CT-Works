"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, Plus, Layers, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SystemPanel } from "@/components/system-panel"
import { ParamForm } from "@/components/param-form"
import { IedCard } from "@/components/ied-card"
import { SharedResults } from "@/components/shared-results"
import { useProject, useStoreActions, newBay, newIed, listTemplates } from "@/lib/store"
import { CT_WIRING_FIELDS, VT_WIRING_FIELDS, type Bay, type Project } from "@/lib/engine/model"
import { evaluateBay, validateCt, validateVt } from "@/lib/engine/calc-engine"

export function StudyWorkspace({ projectId }: { projectId: string }) {
 const project = useProject(projectId)
 const { updateProject } = useStoreActions()
 const [activeBayId, setActiveBayId] = useState<string | null>(null)

 if (!project) {
 return (
 <div className="flex flex-col items-center gap-3 py-20 text-center">
 <p className="text-sm text-muted-foreground">Study not found.</p>
 <Button asChild variant="outline">
 <Link href="/">Back to studies</Link>
 </Button>
 </div>
 )
 }

 const activeBay = project.bays.find((b) => b.id === activeBayId) ?? project.bays[0] ?? null

 function mutate(updater: (p: Project) => Project) {
 updateProject(projectId, updater)
 }

 function addBay() {
 const bay = newBay(project!.id, `Bay ${String(project!.bays.length + 1).padStart(2, "0")}`)
 setActiveBayId(bay.id)
 mutate((p) => ({ ...p, bays: [...p.bays, bay] }))
 }

 function updateBay(bayId: string, updater: (b: Bay) => Bay) {
 mutate((p) => ({ ...p, bays: p.bays.map((b) => (b.id === bayId ? updater(b) : b)) }))
 }

 return (
 <div className="flex flex-col gap-6">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <Button asChild variant="ghost" size="icon" aria-label="Back">
 <Link href="/">
 <ArrowLeft className="size-4" aria-hidden />
 </Link>
 </Button>
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-balance">{project.name}</h1>
 <p className="text-xs text-muted-foreground">
 {project.substation ?? "Unassigned substation"} · {project.system.busVoltageKV} kV ·{" "}
 {project.bays.length} bays
 </p>
 </div>
 </div>
 </div>

 <Tabs defaultValue="system">
 <TabsList>
 <TabsTrigger value="system">System</TabsTrigger>
 <TabsTrigger value="bay">Bays &amp; IEDs</TabsTrigger>
 </TabsList>

 <TabsContent value="system" className="mt-4">
 <SystemPanel system={project.system} onChange={(system) => mutate((p) => ({ ...p, system }))} />
 </TabsContent>

 <TabsContent value="bay" className="mt-4">
 {project.bays.length === 0 ? (
 <Card className="flex flex-col items-center gap-3 border-dashed py-14 text-center">
 <Layers className="size-8 text-muted-foreground" aria-hidden />
 <p className="text-sm text-muted-foreground">No bays yet.</p>
 <Button onClick={addBay}>
 <Plus className="size-4" aria-hidden />
 Add bay
 </Button>
 </Card>
 ) : (
 <div className="flex flex-col gap-5">
 <div className="flex flex-wrap items-center gap-3">
 <Select value={activeBay?.id} onValueChange={setActiveBayId}>
 <SelectTrigger className="w-64">
 <SelectValue placeholder="Select a bay" />
 </SelectTrigger>
 <SelectContent>
 {project.bays.map((b) => (
 <SelectItem key={b.id} value={b.id}>
 {b.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button variant="outline" onClick={addBay}>
 <Plus className="size-4" aria-hidden />
 Add bay
 </Button>
 </div>

 {activeBay ? (
 <BayEditor
 key={activeBay.id}
 project={project}
 bay={activeBay}
 onUpdateBay={(updater) => updateBay(activeBay.id, updater)}
 />
 ) : null}
 </div>
 )}
 </TabsContent>
 </Tabs>
 </div>
 )
}

function BayEditor({
 project,
 bay,
 onUpdateBay,
}: {
 project: Project
 bay: Bay
 onUpdateBay: (updater: (b: Bay) => Bay) => void
}) {
 const [templateId, setTemplateId] = useState(listTemplates()[0].id)
 const evaluation = useMemo(() => evaluateBay(project.system, bay), [project.system, bay])
 const ctIssues = validateCt(bay.ct)
 const vtIssues = validateVt(bay.vt)

 const suitableCount = evaluation.ieds.filter((e) => e.adequacy?.verdict === "suitable").length
 const evaluatedCount = evaluation.ieds.filter((e) => e.adequacy !== null).length

 function addIed() {
 const template = listTemplates().find((t) => t.id === templateId)!
 const count = bay.ieds.filter((i) => i.templateId === templateId).length + 1
 const ied = newIed(bay.id, templateId, `${template.name} #${count}`)
 onUpdateBay((b) => ({ ...b, ieds: [...b.ieds, ied] }))
 }

 return (
 <div className="flex flex-col gap-5">
 <div className="grid gap-4 lg:grid-cols-2">
 <Card className="flex flex-col gap-3 p-5">
 <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">CT wiring</h3>
 <ParamForm
 fields={CT_WIRING_FIELDS}
 values={bay.ct as unknown as Record<string, number>}
 issues={ctIssues}
 onChange={(key, value) => onUpdateBay((b) => ({ ...b, ct: { ...b.ct, [key]: value } }))}
 />
 </Card>
 <Card className="flex flex-col gap-3 p-5">
 <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">VT wiring</h3>
 <ParamForm
 fields={VT_WIRING_FIELDS}
 values={bay.vt as unknown as Record<string, number>}
 issues={vtIssues}
 onChange={(key, value) => onUpdateBay((b) => ({ ...b, vt: { ...b.vt, [key]: value } }))}
 />
 </Card>
 </div>

 <SharedResults ctWiring={evaluation.ctWiring} vtWiring={evaluation.vtWiring} fault={evaluation.fault} />

 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-semibold">Protection IEDs</h3>
 {evaluatedCount > 0 ? (
 <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
 {suitableCount === evaluatedCount ? (
 <CheckCircle2 className="size-3.5 text-success" aria-hidden />
 ) : (
 <XCircle className="size-3.5 text-destructive" aria-hidden />
 )}
 {suitableCount}/{evaluatedCount} suitable
 </span>
 ) : null}
 </div>
 <div className="flex items-center gap-2">
 <Select value={templateId} onValueChange={setTemplateId}>
 <SelectTrigger className="w-56">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {listTemplates().map((t) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name} — {t.family}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button onClick={addIed}>
 <Plus className="size-4" aria-hidden />
 Add IED
 </Button>
 </div>
 </div>

 {bay.ieds.length === 0 ? (
 <Card className="border-dashed py-10 text-center text-sm text-muted-foreground">
 No IEDs in this bay. Pick a template and add one.
 </Card>
 ) : (
 <div className="flex flex-col gap-4">
 {bay.ieds.map((ied) => (
 <IedCard
 key={ied.id}
 ied={ied}
 evaluation={evaluation.ieds.find((e) => e.ied.id === ied.id)}
 onChangeParam={(key, value) =>
 onUpdateBay((b) => ({
 ...b,
 ieds: b.ieds.map((i) => (i.id === ied.id ? { ...i, params: { ...i.params, [key]: value } } : i)),
 }))
 }
 onDelete={() => onUpdateBay((b) => ({ ...b, ieds: b.ieds.filter((i) => i.id !== ied.id) }))}
 />
 ))}
 </div>
 )}
 </div>
 )
}
