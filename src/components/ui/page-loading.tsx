import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { LucideIcon, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface PageLoadingProps {
  className?: string;
  variant?: "cards" | "table" | "list";
  count?: number;
}

export function PageLoading({ className, variant = "cards", count = 6 }: PageLoadingProps) {
  if (variant === "table") {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        <div className="flex gap-4 p-3 border-b">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 flex-1" variant="text" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3">
            <Skeleton className="h-10 w-10" variant="circular" />
            <Skeleton className="h-4 flex-[2]" variant="text" />
            <Skeleton className="h-4 flex-1" variant="text" />
            <Skeleton className="h-4 flex-1" variant="text" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <Skeleton className="h-12 w-12" variant="circular" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" variant="text" />
              <Skeleton className="h-3 w-1/2" variant="text" />
            </div>
            <Skeleton className="h-8 w-20" variant="rectangular" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" variant="text" />
            <Skeleton className="h-10 w-10" variant="circular" />
          </div>
          <Skeleton className="h-8 w-32" variant="text" />
          <Skeleton className="h-3 w-20" variant="text" />
        </div>
      ))}
    </div>
  );
}

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function PageError({ message = "Ocorreu um erro ao carregar os dados.", onRetry, className }: PageErrorProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
