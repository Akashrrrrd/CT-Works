import { CheckCircle2, XCircle } from "lucide-react"
import type { Verdict } from "@/lib/engine/results"
import { cn } from "@/lib/utils"

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const suitable = verdict === "suitable"
  const Icon = suitable ? CheckCircle2 : XCircle
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        suitable
          ? "bg-success/15 text-success"
          : "bg-destructive/15 text-destructive",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {suitable ? "Suitable" : "Not suitable"}
    </span>
  )
}
