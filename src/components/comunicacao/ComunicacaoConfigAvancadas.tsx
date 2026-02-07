import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Moon, 
  MessageSquare, 
  User, 
  Image, 
  Bell,
  Save,
  Smartphone,
  Shield,
  CreditCard
} from "lucide-react";
import { ComunicacaoConfigAvancadas as ConfigType, ComunicacaoCreditos } from "@/hooks/useComunicacao";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface ConfigWhatsApp {
  api_provider: string;
  api_url: string | null;
  api_token: string | null;
  numero_whatsapp: string | null;
}

interface Props {
  config: ConfigType | null;
  creditos: ComunicacaoCreditos | null;
  configWhatsApp: ConfigWhatsApp | null;
  onUpdateConfig: (updates: Partial<ConfigType>) => Promise<void>;
  onUpdateCreditos: (updates: Partial<ComunicacaoCreditos>) => Promise<void>;
  onSaveWhatsApp: () => Promise<void>;
  onConfigWhatsAppChange: (updates: Partial<ConfigWhatsApp>) => void;
  saving: boolean;
}

export function ComunicacaoConfigAvancadas({ 
  config, 
  creditos,
  configWhatsApp,
  onUpdateConfig, 
  onUpdateCreditos,
  onSaveWhatsApp,
  onConfigWhatsAppChange,
  saving 
}: Props) {
  if (!config) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conexão WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conexão WhatsApp API
          </CardTitle>
          <CardDescription>
            Configure o provedor de API para envio de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor de API</Label>
            <Select
              value={configWhatsApp?.api_provider || "evolution_api"}
              onValueChange={(value) => onConfigWhatsAppChange({ api_provider: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution_api">Evolution API (Gratuito)</SelectItem>
                <SelectItem value="wppconnect">WPPConnect (Gratuito)</SelectItem>
                <SelectItem value="baileys">Baileys (Gratuito)</SelectItem>
                <SelectItem value="oficial">WhatsApp Business API (Pago)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input
                placeholder="http://localhost:8080"
                value={configWhatsApp?.api_url || ""}
                onChange={(e) => onConfigWhatsAppChange({ api_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Token de Autenticação</Label>
              <Input
                type="password"
                placeholder="Seu token"
                value={configWhatsApp?.api_token || ""}
                onChange={(e) => onConfigWhatsAppChange({ api_token: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Número do WhatsApp</Label>
            <Input
              placeholder="(11) 99999-8888"
              value={configWhatsApp?.numero_whatsapp || ""}
              onChange={(e) => onConfigWhatsAppChange({ numero_whatsapp: e.target.value })}
            />
          </div>

          <Button onClick={onSaveWhatsApp} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Horário de Silêncio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Horário de Silêncio
          </CardTitle>
          <CardDescription>
            Não enviar mensagens fora do horário comercial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Não enviar depois de:</Label>
              <Input
                type="time"
                value={config.horario_silencio_inicio}
                onChange={(e) => onUpdateConfig({ horario_silencio_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Não enviar antes de:</Label>
              <Input
                type="time"
                value={config.horario_silencio_fim}
                onChange={(e) => onUpdateConfig({ horario_silencio_fim: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Mensagens agendadas fora deste horário serão enviadas no início do próximo período permitido
          </p>
        </CardContent>
      </Card>

      {/* Limites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Limites e Proteção Anti-Spam
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Limite diário de mensagens</Label>
            <Input
              type="number"
              value={config.limite_diario_mensagens}
              onChange={(e) => onUpdateConfig({ 
                limite_diario_mensagens: parseInt(e.target.value) || 500 
              })}
            />
            <p className="text-xs text-muted-foreground">
              Evita envio excessivo e bloqueio da conta
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Palavra-chave para Opt-out</Label>
            <Input
              value={config.opt_out_keyword}
              onChange={(e) => onUpdateConfig({ opt_out_keyword: e.target.value.toUpperCase() })}
            />
            <p className="text-xs text-muted-foreground">
              Clientes podem digitar "{config.opt_out_keyword}" para parar de receber mensagens
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personalização */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Personalização do Remetente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Remetente</Label>
            <Input
              placeholder="Nome do salão"
              value={config.nome_remetente || ""}
              onChange={(e) => onUpdateConfig({ nome_remetente: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>URL da Foto de Perfil</Label>
            <Input
              placeholder="https://..."
              value={config.foto_perfil_url || ""}
              onChange={(e) => onUpdateConfig({ foto_perfil_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Foto que aparecerá no perfil do WhatsApp Business
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fallback SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Fallback para SMS
          </CardTitle>
          <CardDescription>
            Se WhatsApp falhar, tenta enviar por SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar fallback SMS</Label>
              <p className="text-xs text-muted-foreground">
                Envia SMS se mensagem WhatsApp não for entregue
              </p>
            </div>
            <Switch
              checked={config.fallback_sms}
              onCheckedChange={(checked) => onUpdateConfig({ fallback_sms: checked })}
            />
          </div>

          {config.fallback_sms && (
            <div className="space-y-2">
              <Label>API Key do SMS</Label>
              <Input
                type="password"
                placeholder="Chave da API de SMS"
                value={config.sms_api_key || ""}
                onChange={(e) => onUpdateConfig({ sms_api_key: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Créditos */}
      {creditos && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Configurações de Créditos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alerta quando créditos abaixo de:</Label>
                <Input
                  type="number"
                  value={creditos.alerta_creditos_minimo}
                  onChange={(e) => onUpdateCreditos({ 
                    alerta_creditos_minimo: parseInt(e.target.value) || 50 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo por mensagem (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={creditos.custo_por_mensagem}
                  onChange={(e) => onUpdateCreditos({ 
                    custo_por_mensagem: parseFloat(e.target.value) || 0.05 
                  })}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="text-sm">Saldo atual:</span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {creditos.saldo_creditos} créditos
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Custo estimado por mês: R$ {(creditos.custo_por_mensagem * 500).toFixed(2)} 
                (considerando 500 mensagens)
              </p>
            </div>

            <Button variant="outline" className="w-full">
              💳 Comprar Créditos (Integração Futura)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
