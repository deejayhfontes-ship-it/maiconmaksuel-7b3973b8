import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-ios-sm px-2.5 py-1 text-[12px] font-semibold transition-all duration-200 ease-ios",
  {
    variants: {
      variant: {
        default: "ios-badge ios-badge-info",
        secondary: "ios-badge ios-badge-neutral",
        destructive: "ios-badge ios-badge-destructive",
        success: "ios-badge ios-badge-success",
        warning: "ios-badge ios-badge-warning",
        info: "ios-badge ios-badge-info",
        outline: "ios-badge border border-border bg-transparent text-muted-foreground",
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
