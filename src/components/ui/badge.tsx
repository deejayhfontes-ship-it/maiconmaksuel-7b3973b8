import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-ios-sm border-0 px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide transition-all duration-200 ease-ios",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive-bg text-destructive-text",
        success: "bg-success-bg text-success-text",
        warning: "bg-warning-bg text-warning-text",
        info: "bg-info-bg text-info-text",
        outline: "text-muted-foreground border border-border bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
