/**
 * Kiosk Content Settings - Messages and Custom Content
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useKioskSettings, IdleMessage } from "@/hooks/useKioskSettings";
import { 
  MessageSquare, 
  Heart, 
  Clock, 
  Plus,
  Trash2,
  GripVertical,
  Save
} from "lucide-react";

export default function KioskContentSettings() {
  const { settings, updateSettings, isSaving, resetContent } = useKioskSettings();
  const [localMessages, setLocalMessages] = useState<IdleMessage[]>(
    settings.mensagens_idle || []
  );

  const handleAddMessage = () => {
    const newMessage: IdleMessage = {
      id: Date.now().toString(),
      text: '',
      enabled: true,
    };
    setLocalMessages([...localMessages, newMessage]);
  };

  const handleUpdateMessage = (id: string, text: string) => {
    setLocalMessages(localMessages.map(msg => 
      msg.id === id ? { ...msg, text } : msg
    ));
  };

  const handleToggleMessage = (id: string) => {
    setLocalMessages(localMessages.map(msg => 
      msg.id === id ? { ...msg, enabled: !msg.enabled } : msg
    ));
  };

  const handleRemoveMessage = (id: string) => {
    setLocalMessages(localMessages.filter(msg => msg.id !== id));
  };

  const handleSaveMessages = () => {
    updateSettings({ mensagens_idle: localMessages.filter(msg => msg.text.trim()) });
  };

  return (
    <div className="space-y-6">
      {/* Idle Screen Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensagens da Tela de Espera
              </CardTitle>
              <CardDescription>
                Textos rotativos exibidos na tela de espera do kiosk
              </CardDescription>
            </div>
            <Switch
              checked={settings.modulo_mensagens_idle}
              onCheckedChange={(checked) => updateSettings({ modulo_mensagens_idle: checked })}
              disabled={isSaving}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {localMessages.map((message, index) => (
            <div key={message.id} className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <div className="flex-1">
                <Input
                  placeholder={`Mensagem ${index + 1}`}
                  value={message.text}
                  onChange={(e) => handleUpdateMessage(message.id, e.target.value)}
                  disabled={!message.enabled}
                  className={!message.enabled ? 'opacity-50' : ''}
                />
              </div>
              <Switch
                checked={message.enabled}
                onCheckedChange={() => handleToggleMessage(message.id)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMessage(message.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMessage}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Mensagem
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMessages}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar Mensagens
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Thank You Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Mensagem de Agradecimento
          </CardTitle>
          <CardDescription>
            Exibida após o cliente confirmar o pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Texto de Agradecimento</Label>
            <Textarea
              placeholder="Obrigado pela preferência! Volte sempre!"
              value={settings.mensagem_obrigado}
              onChange={(e) => updateSettings({ mensagem_obrigado: e.target.value })}
              disabled={isSaving}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Duração da Tela de Agradecimento</Label>
              <span className="text-sm text-muted-foreground">
                {settings.duracao_obrigado} segundos
              </span>
            </div>
            <Slider
              value={[settings.duracao_obrigado]}
              min={3}
              max={15}
              step={1}
              onValueChange={(value) => updateSettings({ duracao_obrigado: value[0] })}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Comanda Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Exibição da Comanda
          </CardTitle>
          <CardDescription>
            Configurações de exibição do resumo da comanda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tempo de Exibição da Comanda</Label>
              <span className="text-sm text-muted-foreground">
                {settings.duracao_comanda} segundos
              </span>
            </div>
            <Slider
              value={[settings.duracao_comanda]}
              min={5}
              max={30}
              step={1}
              onValueChange={(value) => updateSettings({ duracao_comanda: value[0] })}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Após esse tempo, a comanda é automaticamente dispensada e a tela de agradecimento é exibida.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div>
              <Label className="font-medium">Mostrar Relógio</Label>
              <p className="text-xs text-muted-foreground">
                Exibe o relógio no canto superior
              </p>
            </div>
            <Switch
              checked={settings.modulo_relogio}
              onCheckedChange={(checked) => updateSettings({ modulo_relogio: checked })}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={resetContent}
          disabled={isSaving}
        >
          Restaurar Conteúdo Padrão
        </Button>
      </div>
    </div>
  );
}
