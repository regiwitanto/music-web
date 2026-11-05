// Adapted from shadcn/ui (MIT). See THIRD_PARTY_NOTICES.md.
// Restyled to the design tokens: a divider-coloured block with the small radius.
import { cn } from "@/presentation/lib/cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-divider", className)}
      {...props}
    />
  )
}

export { Skeleton }
