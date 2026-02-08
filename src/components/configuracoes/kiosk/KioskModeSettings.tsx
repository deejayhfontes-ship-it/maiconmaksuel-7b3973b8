/**
 * Kiosk Mode Settings Page
 * Comprehensive configuration for kiosk mode operation
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Route, 
  Lock, 
  Calendar, 
  Clock, 
  Palette, 
  Hand, 
  Wrench, 
  Activity,
  Eye
} from "lucide-react";

import KioskRoutesSettings from "./KioskRoutesSettings";
import KioskWindowSettings from "./KioskWindowSettings";
import KioskAgendaSettings from "./KioskAgendaSettings";
import KioskPontoSettings from "./KioskPontoSettings";
import KioskVisualSettings from "./KioskVisualSettings";
import KioskInteractionSettings from "./KioskInteractionSettings";
import KioskMaintenanceSettings from "./KioskMaintenanceSettings";
import KioskDiagnostics from "./KioskDiagnostics";
import KioskLivePreview from "./KioskLivePreview";

const tabs = [
  { id: 'routes', label: 'Rotas', icon: Route },
  { id: 'lockdown', label: 'Bloqueio', icon: Lock },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'ponto', label: 'Ponto', icon: Clock },
  { id: 'visual', label: 'Visual', icon: Palette },
  { id: 'interaction', label: 'Interação', icon: Hand },
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'diagnostics', label: 'Diagnóstico', icon: Activity },
  { id: 'preview', label: 'Preview', icon: Eye },
];

export default function KioskModeSettings() {
  const [activeTab, setActiveTab] = useState('routes');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Modo Kiosk
        </h2>
        <p className="text-muted-foreground">
          Configure o comportamento do sistema em modo kiosk (totem de atendimento)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 lg:grid-cols-9 h-auto gap-1 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <KioskRoutesSettings />
        </TabsContent>

        <TabsContent value="lockdown" className="space-y-4">
          <KioskWindowSettings />
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4">
          <KioskAgendaSettings />
        </TabsContent>

        <TabsContent value="ponto" className="space-y-4">
          <KioskPontoSettings />
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <KioskVisualSettings />
        </TabsContent>

        <TabsContent value="interaction" className="space-y-4">
          <KioskInteractionSettings />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <KioskMaintenanceSettings />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <KioskDiagnostics />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <KioskLivePreview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
