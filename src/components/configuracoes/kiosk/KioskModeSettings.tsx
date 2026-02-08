/**
 * Kiosk Mode Settings Page - Complete Configuration
 * Comprehensive configuration for kiosk mode operation
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { 
  Tablet, 
  Palette, 
  Hand, 
  FileText, 
  Wrench, 
  Eye,
  Fingerprint,
  Calendar,
  Receipt,
  Shield,
  Power
} from "lucide-react";

import KioskVisualSettings from "./KioskVisualSettings";
import KioskContentSettings from "./KioskContentSettings";
import KioskInteractionSettings from "./KioskInteractionSettings";
import KioskMaintenanceSettings from "./KioskMaintenanceSettings";
import KioskLivePreview from "./KioskLivePreview";
import KioskSecurityInfo from "./KioskSecurityInfo";

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: Tablet },
  { id: 'visual', label: 'Visual', icon: Palette },
  { id: 'content', label: 'Conteúdo', icon: FileText },
  { id: 'interaction', label: 'Interação', icon: Hand },
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'preview', label: 'Preview', icon: Eye },
];

export default function KioskModeSettings() {
  const [activeTab, setActiveTab] = useState('overview');
  const { settings, updateSettings, isSaving } = useKioskSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Tablet className="h-5 w-5" />
          Modo Kiosk
        </h2>
        <p className="text-muted-foreground">
          Configure o comportamento do sistema em modo kiosk (totem de atendimento)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto gap-1 p-1">
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <KioskOverview 
            settings={settings} 
            updateSettings={updateSettings} 
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <KioskVisualSettings />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <KioskContentSettings />
        </TabsContent>

        <TabsContent value="interaction" className="space-y-4">
          <KioskInteractionSettings />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <KioskMaintenanceSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <KioskSecurityInfo />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <KioskLivePreview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Kiosk Overview - Quick configuration summary and module toggles
 */
interface KioskOverviewProps {
  settings: ReturnType<typeof useKioskSettings>['settings'];
  updateSettings: ReturnType<typeof useKioskSettings>['updateSettings'];
  isSaving: boolean;
}

function KioskOverview({ settings, updateSettings, isSaving }: KioskOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Tablet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Kiosk Touch</CardTitle>
                <CardDescription>
                  Terminal de atendimento para clientes e funcionários
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={settings.modulo_tela_espera ? "default" : "secondary"}
              className="text-sm"
            >
              {settings.modulo_tela_espera ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-white rounded-xl border">
              <p className="text-muted-foreground">Tema</p>
              <p className="font-semibold capitalize">{settings.tema_kiosk}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border">
              <p className="text-muted-foreground">Tipografia</p>
              <p className="font-semibold">{settings.tipografia_grande ? "Grande" : "Normal"}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border">
              <p className="text-muted-foreground">Touch</p>
              <p className="font-semibold">{settings.alvos_touch_grandes ? "Grande" : "Normal"}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border">
              <p className="text-muted-foreground">Fullscreen</p>
              <p className="font-semibold">{settings.forcar_fullscreen ? "Automático" : "Manual"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Módulos Disponíveis
          </CardTitle>
          <CardDescription>
            Escolha quais funcionalidades estarão disponíveis no kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ponto Module */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Fingerprint className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <Label className="font-medium">Ponto Eletrônico</Label>
                <p className="text-xs text-muted-foreground">
                  Permite registro de ponto pelos funcionários
                </p>
              </div>
            </div>
            <Switch
              checked={settings.modulo_ponto}
              onCheckedChange={(checked) => updateSettings({ 
                modulo_ponto: checked,
                ponto_habilitado: checked,
              })}
              disabled={isSaving}
            />
          </div>

          {/* Agenda Module */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label className="font-medium">Agenda (Simplificada)</Label>
                <p className="text-xs text-muted-foreground">
                  Visualização somente leitura dos agendamentos
                </p>
              </div>
            </div>
            <Switch
              checked={settings.modulo_agenda}
              onCheckedChange={(checked) => updateSettings({ 
                modulo_agenda: checked,
                agenda_visivel: checked,
                rotas_habilitadas: {
                  ...settings.rotas_habilitadas,
                  kiosk_agenda: checked,
                }
              })}
              disabled={isSaving}
            />
          </div>

          {/* Fechamento Comanda Module */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label className="font-medium">Fechamento de Comanda</Label>
                <p className="text-xs text-muted-foreground">
                  Exibe resumo do atendimento quando finalizado
                </p>
              </div>
            </div>
            <Switch
              checked={settings.modulo_fechamento_comanda}
              onCheckedChange={(checked) => updateSettings({ modulo_fechamento_comanda: checked })}
              disabled={isSaving}
            />
          </div>

          {/* Idle Screen Module */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <Label className="font-medium">Tela de Espera (Branding)</Label>
                <p className="text-xs text-muted-foreground">
                  Logo animada e mensagens rotativas
                </p>
              </div>
            </div>
            <Switch
              checked={settings.modulo_tela_espera}
              onCheckedChange={(checked) => updateSettings({ modulo_tela_espera: checked })}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/kiosk', '_blank')}
            >
              <Tablet className="h-4 w-4 mr-2" />
              Abrir Kiosk
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('/kiosk/ponto', '_blank')}
              disabled={!settings.modulo_ponto}
            >
              <Fingerprint className="h-4 w-4 mr-2" />
              Abrir Ponto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
