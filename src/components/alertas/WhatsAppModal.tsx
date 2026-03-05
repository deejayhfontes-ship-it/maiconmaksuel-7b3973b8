/**
 * WhatsApp Send Modal with template selection and preview
 */
import { useState, useEffect } from "react";
import { MessageSquare, Copy, ExternalLink, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSalonSettings } from "@/contexts/SalonSettingsContext";
import type { NotificationAlert, NotificationTemplate, AlertType } from "@/hooks/useNotificationsAlerts";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: NotificationAlert | null;
  templates: NotificationTemplate[];
  onSend: (alertId: string, message: string, method: 'api' | 'web') => Promise<void>;
}

export function WhatsAppModal({ isOpen, onClose, alert, templates, onSend }: WhatsAppModalProps) {
  const { salonData } = useSalonSettings();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter templates by alert type
  const relevantTemplates = templates.filter(t => t.type === alert?.type);

  // Replace template variables
  const replaceVariables = (content: string) => {
    if (!alert) return content;

    const replacements: Record<string, string> = {
      '{nome}': alert.entity_name || '',
      '{primeiro_nome}': alert.entity_name?.split(' ')[0] || '',
      '{salon_name}': salonData?.nome_salao || 'Salão',
      '{cupom}': '🎁 Use o código ANIVERSARIO10 e ganhe 10% OFF!',
      '{data}': alert.metadata?.data ? new Date(alert.metadata.data).toLocaleDateString('pt-BR') : '',
      '{hora}': alert.metadata?.hora || '',
      '{servico}': alert.metadata?.servico || '',
      '{profissional}': alert.metadata?.profissional || ''
    };

    let result = content;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  };

  // When template changes, update message
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setMessage(replaceVariables(template.content));
      }
    }
  }, [selectedTemplateId, alert, templates]);

  // Set default template
  useEffect(() => {
    if (isOpen && relevantTemplates.length > 0) {
      const defaultTemplate = relevantTemplates.find(t => t.is_default) || relevantTemplates[0];
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setMessage(replaceVariables(defaultTemplate.content));
      }
    }
  }, [isOpen, relevantTemplates.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const phone = alert?.metadata?.celular?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Número de telefone não encontrado');
      return;
    }

    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
    onSend(alert!.id, message, 'web');
    onClose();
  };

  const handleSendViaAPI = async () => {
    if (!alert) return;
    
    setIsSending(true);
    try {
      await onSend(alert.id, message, 'api');
      toast.success('Mensagem enviada com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao enviar mensagem. Tente via WhatsApp Web.');
    } finally {
      setIsSending(false);
    }
  };

  if (!alert) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Recipient info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{alert.entity_name}</p>
            <p className="text-sm text-muted-foreground">{alert.metadata?.celular}</p>
            {!alert.metadata?.allow_marketing && (
              <Badge variant="destructive" className="mt-1 text-xs">
                Cliente optou por não receber marketing
              </Badge>
            )}
          </div>

          {/* Template selection */}
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {relevantTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.is_default && "(Padrão)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message preview/edit */}
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Você pode editar a mensagem antes de enviar
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
          <Button variant="outline" onClick={handleOpenWhatsApp} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Abrir WhatsApp Web
          </Button>
          <Button 
            onClick={handleSendViaAPI} 
            disabled={isSending || !alert.metadata?.allow_marketing}
            className="gap-2"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Enviar via API
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
