"use client"

/**
 * Data Persistence layer.
 *
 * Kept behind a small `StorageAdapter` interface so the backing store can be
 * swapped (e.g. a Neon/Postgres adapter) without touching the UI. The default
 * adapter persists to localStorage, which keeps the deterministic engine fully
 * demonstrable client-side. Swap `adapter` for a server-backed implementation
 * to make projects durable and shareable.
 */

import { createContext, useContext, useSyncExternalStore, useCallback } from "react"
import {
 type Project,
 type Bay,
 type IedInstance,
 defaultSystem,
 defaultCtWiring,
 defaultVtWiring,
} from "./engine/model"
import { getTemplate, listTemplates } from "./engine/templates"

const STORAGE_KEY = "ctvt.projects.v1"

interface StorageAdapter {
 load(): Project[]
 save(projects: Project[]): void
}

const localStorageAdapter: StorageAdapter = {
 load() {
 if (typeof window === "undefined") return []
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY)
 if (!raw) return []
 return JSON.parse(raw) as Project[]
 } catch {
 return []
 }
 },
 save(projects) {
 if (typeof window === "undefined") return
 window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
 },
}

/* ------------------------------- ids ---------------------------------- */
function uid(prefix: string): string {
 return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

/* ---------------------------- factories -------------------------------- */

export function newBay(projectId: string, name: string): Bay {
 return {
 id: uid("bay"),
 projectId,
 name,
 voltageClass: "132 kV",
 ct: defaultCtWiring(),
 vt: defaultVtWiring(),
 ieds: [],
 }
}

export function newIed(bayId: string, templateId: string, name: string): IedInstance {
 const template = getTemplate(templateId)
 return {
 id: uid("ied"),
 bayId,
 templateId,
 name,
 params: { ...template.defaultParams },
 }
}

export function newProject(name: string): Project {
 const id = uid("prj")
 const now = Date.now()
 return {
 id,
 name,
 system: defaultSystem(),
 bays: [],
 createdAt: now,
 updatedAt: now,
 }
}

/** Seed project reproducing the RED670 & 7SJ85 template worked examples. */
function seedProject(): Project {
 const project = newProject("Example — 132 kV Line Bay Study")
 project.client = "Reference Substation"
 project.substation = "132/33 kV GIS"
 project.description = "Seeded from the RED670 & 7SJ85 Excel templates for verification."
 const bay = newBay(project.id, "Bay 01 — 132 kV Line")
 const red = newIed(bay.id, "RED670", "RED670 T1 — Core 1 (Line Diff & Dist.)")
 const sj = newIed(bay.id, "7SJ85", "7SJ85 T1 — Core 3 (OC + BCU)")
 bay.ieds = [red, sj]
 project.bays = [bay]
 return project
}

/* ------------------------------ store ---------------------------------- */

class ProjectStore {
 private projects: Project[] = []
 private listeners = new Set<() => void>()
 private initialized = false

 private ensure() {
 if (this.initialized) return
 this.initialized = true
 const loaded = localStorageAdapter.load()
 this.projects = loaded.length > 0 ? loaded : [seedProject()]
 if (loaded.length === 0) localStorageAdapter.save(this.projects)
 }

 subscribe = (listener: () => void) => {
 this.listeners.add(listener)
 return () => this.listeners.delete(listener)
 }

 getSnapshot = (): Project[] => {
 this.ensure()
 return this.projects
 }

 private commit(next: Project[]) {
 this.projects = next
 localStorageAdapter.save(next)
 this.listeners.forEach((l) => l())
 }

 private touch(project: Project): Project {
 return { ...project, updatedAt: Date.now() }
 }

 addProject(name: string): Project {
 this.ensure()
 const project = newProject(name)
 this.commit([...this.projects, project])
 return project
 }

 deleteProject(id: string) {
 this.commit(this.projects.filter((p) => p.id !== id))
 }

 updateProject(id: string, updater: (p: Project) => Project) {
 this.commit(this.projects.map((p) => (p.id === id ? this.touch(updater(p)) : p)))
 }
}

const store = new ProjectStore()

/* ------------------------------ hooks ---------------------------------- */

const StoreContext = createContext(store)

export function StoreProvider({ children }: { children: React.ReactNode }) {
 return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useProjects(): Project[] {
 const s = useContext(StoreContext)
 return useSyncExternalStore(s.subscribe, s.getSnapshot, () => [])
}

export function useProject(id: string | undefined): Project | undefined {
 const projects = useProjects()
 return projects.find((p) => p.id === id)
}

export function useStoreActions() {
 const s = useContext(StoreContext)
 return {
 addProject: useCallback((name: string) => s.addProject(name), [s]),
 deleteProject: useCallback((id: string) => s.deleteProject(id), [s]),
 updateProject: useCallback(
 (id: string, updater: (p: Project) => Project) => s.updateProject(id, updater),
 [s],
 ),
 }
}

export { listTemplates }
