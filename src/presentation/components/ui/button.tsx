// Adapted from shadcn/ui (MIT). See THIRD_PARTY_NOTICES.md.
// Restyled to the design tokens (design-system §2, §5, §9): semantic colours only,
// the global :focus-visible ring, and 44 px minimum targets on touch layouts.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/presentation/lib/cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm text-body-strong whitespace-nowrap transition-colors duration-(--motion-fast) ease-(--motion-fast-ease) disabled:pointer-events-none disabled:opacity-40 aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:opacity-90",
        secondary: "border border-strong bg-surface text-text hover:bg-raised",
        ghost: "text-text hover:bg-text/6 active:bg-text/10",
        danger: "bg-danger text-bg hover:opacity-90",
      },
      size: {
        default: "min-h-9 px-4 py-2 pointer-coarse:min-h-11",
        icon: "size-10 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
