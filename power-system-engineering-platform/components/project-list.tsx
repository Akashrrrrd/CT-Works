"use client"

import Link from "next/link"
import { useState } from "react"
import { Plus, FolderOpen, Trash2, Building2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogTrigger,
 DialogClose,
} from "@/components/ui/dialog"
import { useProjects, useStoreActions } from "@/lib/store"

export function ProjectList() {
 const projects = useProjects()
 const { addProject, deleteProject } = useStoreActions()
 const [name, setName] = useState("")

 const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)

 return (
 <section className="flex flex-col gap-6">
 <div className="flex flex-wrap items-end justify-between gap-3">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-balance">Studies</h1>
 <p className="mt-1 text-sm text-muted-foreground text-pretty">
 CT &amp; VT adequacy studies. Project system data cascades to every bay and IED.
 </p>
 </div>
 <Dialog>
 <DialogTrigger
 render={
 <Button>
 <Plus className="size-4" aria-hidden />
 New study
 </Button>
 }
 />
 <DialogContent>
 <DialogHeader>
 <DialogTitle>New study</DialogTitle>
 </DialogHeader>
 <div className="flex flex-col gap-2 py-2">
 <Label htmlFor="project-name">Study name</Label>
 <Input
 id="project-name"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. 220 kV Grid Substation — Line Bays"
 autoFocus
 />
 </div>
 <DialogFooter>
 <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
 <DialogClose
 disabled={!name.trim()}
 onClick={() => {
 if (name.trim()) addProject(name.trim())
 setName("")
 }}
 render={<Button />}
 >
 Create
 </DialogClose>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>

 {sorted.length === 0 ? (
 <Card className="flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
 <FolderOpen className="size-8 text-muted-foreground" aria-hidden />
 <p className="text-sm text-muted-foreground">No studies yet. Create one to begin.</p>
 </Card>
 ) : (
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {sorted.map((project) => {
 const iedCount = project.bays.reduce((n, b) => n + b.ieds.length, 0)
 return (
 <Card key={project.id} className="group relative flex flex-col gap-3 p-5 transition-colors hover:border-primary/50">
 <Link href={`/study/${project.id}`} className="flex flex-col gap-3">
 <div className="flex items-start justify-between gap-2">
 <h2 className="text-base font-semibold leading-tight text-balance">{project.name}</h2>
 </div>
 {project.substation ? (
 <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Building2 className="size-3.5" aria-hidden />
 {project.substation}
 </p>
 ) : null}
 <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
 <span className="flex items-center gap-1.5">
 <Layers className="size-3.5" aria-hidden />
 {project.bays.length} bays
 </span>
 <span>{iedCount} IEDs</span>
 <span className="ml-auto">{project.system.busVoltageKV} kV</span>
 </div>
 </Link>
 <button
 type="button"
 aria-label={`Delete ${project.name}`}
 onClick={() => deleteProject(project.id)}
 className="absolute right-3 top-3 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
 >
 <Trash2 className="size-4" aria-hidden />
 </button>
 </Card>
 )
 })}
 </div>
 )}
 </section>
 )
}
