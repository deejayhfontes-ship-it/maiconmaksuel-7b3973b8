import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AgendamentoProximo {
  id: string;
  data_hora: string;
  cliente_nome: string;
  servico_nome: string;
  profissional_nome: string;
}

export function useBrowserNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedAgendamentos = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Criar elemento de áudio para notificação
  useEffect(() => {
    // Criar um som de notificação usando Web Audio API
    audioRef.current = new Audio();
    // Som base64 de notificação simples (beep)
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI2Jg3hwaW1ydXd3dnNwbGhlaGtwc3Z4eHd1cW5raWptcXR3eXl4dnRxbmxrbG9ydXh6e3p5d3VycG5tbG1vcnV4ent7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1sbW9ydXh6e3t7enl3dXJwbm1s";
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Verificar e solicitar permissão
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Navegador não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      toast({
        title: "Notificações já estão ativadas!",
        description: "Você já está recebendo alertas sobre agendamentos.",
      });
      return true;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Notificações bloqueadas",
        description: "As notificações foram bloqueadas. Você precisa permitir nas configurações do navegador.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast({
          title: "Notificações ativadas!",
          description: "Você receberá alertas sobre agendamentos próximos.",
        });
        return true;
      } else {
        toast({
          title: "Permissão negada",
          description: "As notificações push foram bloqueadas.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar permissão para notificações.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Tocar som de notificação
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorar erros de autoplay
      });
    }
    
    // Fallback: usar Web Audio API para gerar um beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Ignorar erros
    }
  }, []);

  // Enviar notificação
  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (Notification.permission !== "granted") return;

    // Evitar notificações duplicadas
    if (notifiedAgendamentos.current.has(tag)) return;
    notifiedAgendamentos.current.add(tag);

    // Tocar som
    playNotificationSound();

    // Mostrar notificação do navegador
    const notification = new Notification(title, {
      body,
      icon: "/favicon.svg",
      tag,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Também mostrar toast interno
    toast({
      title,
      description: body,
    });
  }, [playNotificationSound, toast]);

  // Verificar agendamentos próximos
  const checkUpcomingAgendamentos = useCallback(async () => {
    if (Notification.permission !== "granted") return;

    const agora = new Date();
    const em30Min = new Date(agora.getTime() + 30 * 60 * 1000);

    try {
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          clientes:cliente_id (nome),
          servicos:servico_id (nome),
          profissionais:profissional_id (nome)
        `)
        .gte("data_hora", agora.toISOString())
        .lte("data_hora", em30Min.toISOString())
        .in("status", ["agendado", "confirmado"]);

      agendamentos?.forEach((ag: any) => {
        const dataHora = parseISO(ag.data_hora);
        const minutosAte = differenceInMinutes(dataHora, agora);
        const hora = format(dataHora, "HH:mm");

        // Notificar 15 minutos antes
        if (minutosAte <= 15 && minutosAte > 10) {
          sendNotification(
            "⏰ Agendamento em 15 minutos!",
            `${ag.clientes?.nome || "Cliente"} - ${ag.servicos?.nome || "Serviço"} às ${hora}`,
            `ag-15-${ag.id}`
          );
        }

        // Notificar 5 minutos antes
        if (minutosAte <= 5 && minutosAte > 0) {
          sendNotification(
            "🔔 Agendamento em 5 minutos!",
            `${ag.clientes?.nome || "Cliente"} - ${ag.servicos?.nome || "Serviço"} às ${hora}`,
            `ag-5-${ag.id}`
          );
        }
      });
    } catch (error) {
      console.error("Erro ao verificar agendamentos:", error);
    }
  }, [sendNotification]);

  // Iniciar verificação periódica
  useEffect(() => {
    const startChecking = async () => {
      // Verificar permissão atual
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      // Verificar imediatamente
      if (Notification.permission === "granted") {
        checkUpcomingAgendamentos();
      }

      // Verificar a cada 2 minutos
      checkIntervalRef.current = setInterval(() => {
        if (Notification.permission === "granted") {
          checkUpcomingAgendamentos();
        }
      }, 2 * 60 * 1000);
    };

    startChecking();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkUpcomingAgendamentos]);

  // Limpar notificações antigas a cada hora
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      notifiedAgendamentos.current.clear();
    }, 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    permission,
    requestPermission,
    playNotificationSound,
    sendNotification,
  };
}