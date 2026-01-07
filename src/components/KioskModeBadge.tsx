import { Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KioskModeBadgeProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function KioskModeBadge({ isFullscreen, onToggle }: KioskModeBadgeProps) {
  if (!isFullscreen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="ios-icon-button"
        title="Entrar no Modo Kiosk (F11)"
      >
        <Maximize className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Badge
      className={cn(
        "fixed top-4 right-4 z-50 cursor-pointer",
        "bg-primary/90 hover:bg-primary text-primary-foreground",
        "flex items-center gap-2 px-3 py-1.5 animate-fade-in"
      )}
      onClick={onToggle}
    >
      <Maximize className="h-3.5 w-3.5" />
      Modo Kiosk
      <X className="h-3.5 w-3.5 ml-1 opacity-70" />
    </Badge>
  );
}
