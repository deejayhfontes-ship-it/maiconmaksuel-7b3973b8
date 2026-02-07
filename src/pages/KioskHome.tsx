/**
 * Kiosk Home Page
 * Main landing page for kiosk mode
 */

import { useNavigate } from "react-router-dom";
import { useKioskSettings, type KioskRoutesEnabled } from "@/hooks/useKioskSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  Monitor,
  ChevronRight
} from "lucide-react";

const kioskModules = [
  { 
    key: 'kiosk_caixa', 
    path: '/kiosk/caixa', 
    label: 'Caixa', 
    description: 'Vendas e pagamentos',
    icon: CreditCard,
    color: 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
  },
  { 
    key: 'kiosk_agenda', 
    path: '/kiosk/agenda', 
    label: 'Agenda', 
    description: 'Ver agendamentos',
    icon: Calendar,
    color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
  },
  { 
    key: 'kiosk_ponto', 
    path: '/kiosk/ponto', 
    label: 'Ponto Eletrônico', 
    description: 'Registrar entrada/saída',
    icon: Clock,
    color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
  },
  { 
    key: 'kiosk_espelho', 
    path: '/kiosk/espelho-cliente', 
    label: 'Espelho Cliente', 
    description: 'Visualização para cliente',
    icon: Monitor,
    color: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
  },
];

export default function KioskHome() {
  const navigate = useNavigate();
  const { settings, isRouteEnabled } = useKioskSettings();

  const availableModules = kioskModules.filter(module => 
    isRouteEnabled(module.key as keyof KioskRoutesEnabled)
  );

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="mb-12">
        {settings.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className={cn(
              "h-24 object-contain",
              settings.logo_animacao === 'pulse' && 'animate-pulse'
            )}
          />
        ) : (
          <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Monitor className="h-12 w-12 text-primary" />
          </div>
        )}
      </div>

      {/* Module Grid */}
      <div className={cn(
        "grid gap-6 w-full max-w-4xl",
        availableModules.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-4"
      )}>
        {availableModules.map(({ key, path, label, description, icon: Icon, color }) => (
          <Card 
            key={key}
            className={cn(
              "cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
              settings.alvos_touch_grandes && "p-2"
            )}
            onClick={() => navigate(path)}
          >
            <CardContent className={cn(
              "flex flex-col items-center justify-center p-8 text-center",
              settings.alvos_touch_grandes && "p-12"
            )}>
              <div className={cn(
                "p-4 rounded-2xl mb-4",
                color
              )}>
                <Icon className={cn(
                  "h-12 w-12",
                  settings.alvos_touch_grandes && "h-16 w-16"
                )} />
              </div>
              <h3 className={cn(
                "font-semibold text-lg",
                settings.tipografia_grande && "text-xl"
              )}>
                {label}
              </h3>
              <p className={cn(
                "text-sm text-muted-foreground mt-1",
                settings.tipografia_grande && "text-base"
              )}>
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick access hint */}
      <p className="mt-12 text-muted-foreground text-sm flex items-center gap-2">
        Toque em um módulo para começar
        <ChevronRight className="h-4 w-4 animate-pulse" />
      </p>
    </div>
  );
}
