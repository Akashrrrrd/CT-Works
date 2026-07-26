import { AppHeader } from "@/components/app-header"
import { ProjectList } from "@/components/project-list"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ProjectList />
      </main>
    </div>
  )
}
