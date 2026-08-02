import { AppHeader } from "@/components/app-header"
import { StudyWorkspace } from "@/components/study-workspace"

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params
 return (
 <div className="min-h-screen">
 <AppHeader />
 <main className="mx-auto max-w-6xl px-4 py-6">
 <StudyWorkspace projectId={id} />
 </main>
 </div>
 )
}
