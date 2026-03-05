/**
 * WhatsApp Module - Unified Page
 * Central hub for all WhatsApp communication features
 */

import { useState } from "react";
import { 
  MessageSquare, 
  CheckCircle2, 
  Bell, 
  Star, 
  Megaphone,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { ComunicacaoConfirmacoes } from "@/components/comunicacao/ComunicacaoConfirmacoes";
import { ComunicacaoLembretes } from "@/components/comunicacao/ComunicacaoLembretes";
import { ComunicacaoCampanhas } from "@/components/comunicacao/ComunicacaoCampanhas";
import { ComunicacaoPosAtendimento } from "@/components/comunicacao/ComunicacaoPosAtendimento";
import { ComunicacaoAvaliacaoConfig } from "@/components/comunicacao/ComunicacaoAvaliacaoConfig";
import { useComunicacao } from "@/hooks/useComunicacao";

const tabs = [
  { id: 'confirmacoes', label: 'Confirmações', icon: CheckCircle2 },
  { id: 'lembretes', label: 'Lembretes', icon: Bell },
  { id: 'pos-atendimento', label: 'Pós-atendimento', icon: Star },
  { id: 'avaliacao', label: 'Avaliação', icon: Star },
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone },
];

export default function WhatsAppModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'confirmacoes';
  const [whatsappConectado, setWhatsappConectado] = useState(false);
  
  const { 
    lembretes, 
    campanhas, 
    updateLembrete, 
    updateCampanha,
    loading 
  } = useComunicacao();

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Central WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Gerencie todas as comunicações automáticas via WhatsApp
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <Badge 
            variant={whatsappConectado ? "default" : "secondary"}
            className={whatsappConectado 
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0" 
              : ""
            }
          >
            {whatsappConectado ? (
              <>
                <Wifi className="h-3.5 w-3.5 mr-1.5" />
                Conectado
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 mr-1.5" />
                Desconectado
              </>
            )}
          </Badge>
          
          <Button variant="outline" size="sm" asChild>
            <Link to="/configuracoes/whatsapp">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50 p-1 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="confirmacoes" className="mt-6">
          <ComunicacaoConfirmacoes whatsappConectado={whatsappConectado} />
        </TabsContent>

        <TabsContent value="lembretes" className="mt-6">
          <ComunicacaoLembretes 
            lembretes={lembretes} 
            onUpdateLembrete={updateLembrete}
            onTestarMensagem={() => {}}
            saving={loading}
            testando={false}
          />
        </TabsContent>

        <TabsContent value="pos-atendimento" className="mt-6">
          <ComunicacaoPosAtendimento />
        </TabsContent>

        <TabsContent value="avaliacao" className="mt-6">
          <ComunicacaoAvaliacaoConfig avaliacoes={[]} />
        </TabsContent>

        <TabsContent value="campanhas" className="mt-6">
          <ComunicacaoCampanhas 
            campanhas={campanhas}
            onUpdateCampanha={updateCampanha}
            saving={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
