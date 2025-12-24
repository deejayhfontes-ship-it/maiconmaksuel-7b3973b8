import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

export function NotificationPermissionBanner() {
  const { permission, requestPermission } = useBrowserNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Verificar se já foi dismissado antes
    const wasDismissed = localStorage.getItem("notification-banner-dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
    }

    // Mostrar banner após 3 segundos se permissão não foi concedida
    const timer = setTimeout(() => {
      if (permission === "default" && !wasDismissed) {
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [permission]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShow(false);
    }
  };

  if (!show || dismissed || permission === "granted" || permission === "denied") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in max-w-sm">
      <div className="bg-card border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Ativar Notificações</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Receba alertas sobre agendamentos próximos diretamente no navegador.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleEnable}>
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}