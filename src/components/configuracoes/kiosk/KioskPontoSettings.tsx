/**
 * Kiosk Ponto (Time Clock) Configuration Settings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { 
  Clock, 
  Fingerprint, 
  QrCode, 
  Hash, 
  User, 
  CheckCircle, 
  Ban
} from "lucide-react";

export default function KioskPontoSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();

  const pontoMethods = [
    { value: 'lista_touch', label: 'Lista Touch', icon: Fingerprint, description: 'Seleção por toque na lista' },
    { value: 'qr_code', label: 'QR Code', icon: QrCode, description: 'Leitura de QR Code do funcionário' },
    { value: 'codigo_funcionario', label: 'Código', icon: Hash, description: 'Digitação de código numérico' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Configurações do Ponto Eletrônico
        </CardTitle>
        <CardDescription>
          Configure o módulo de ponto eletrônico para uso no kiosk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <Label htmlFor="ponto-habilitado" className="font-medium">
                Ponto habilitado
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativar módulo de ponto no kiosk
              </p>
            </div>
          </div>
          <Switch
            id="ponto-habilitado"
            checked={settings.ponto_habilitado}
            onCheckedChange={(checked) => updateSettings({ ponto_habilitado: checked })}
            disabled={isSaving}
          />
        </div>

        {/* Method selector */}
        <div className="space-y-3">
          <Label>Método de identificação</Label>
          <div className="grid gap-3">
            {pontoMethods.map(({ value, label, icon: Icon, description }) => (
              <div
                key={value}
                onClick={() => updateSettings({ ponto_metodo: value as typeof settings.ponto_metodo })}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  settings.ponto_metodo === value 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  settings.ponto_metodo === value ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    settings.ponto_metodo === value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {settings.ponto_metodo === value && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="mostrar-foto" className="font-medium">
                  Mostrar foto e nome
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exibe foto e nome do funcionário na lista
                </p>
              </div>
            </div>
            <Switch
              id="mostrar-foto"
              checked={settings.ponto_mostrar_foto_nome}
              onCheckedChange={(checked) => updateSettings({ ponto_mostrar_foto_nome: checked })}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="requer-confirmacao" className="font-medium">
                  Requer confirmação
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exige confirmação antes de registrar ponto
                </p>
              </div>
            </div>
            <Switch
              id="requer-confirmacao"
              checked={settings.ponto_requer_confirmacao}
              onCheckedChange={(checked) => updateSettings({ ponto_requer_confirmacao: checked })}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Ban className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="prevenir-duplicados" className="font-medium">
                  Prevenir duplicados
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bloqueia registros duplicados em curto intervalo
                </p>
              </div>
            </div>
            <Switch
              id="prevenir-duplicados"
              checked={settings.ponto_prevenir_duplicados}
              onCheckedChange={(checked) => updateSettings({ ponto_prevenir_duplicados: checked })}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Rota vinculada:</strong> /kiosk/ponto
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
