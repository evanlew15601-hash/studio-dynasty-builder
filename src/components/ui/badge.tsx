import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-[1px] bg-transparent text-primary hover:bg-primary/5",
        secondary:
          "border-[1px] bg-transparent text-muted-foreground hover:bg-muted/6",
        destructive:
          "border-[1px] bg-transparent text-destructive hover:bg-destructive/6",
        outline: "text-foreground border-[1px] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
