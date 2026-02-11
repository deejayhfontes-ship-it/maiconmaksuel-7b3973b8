import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Edit,
  Clock,
  User,
  Scissors,
  Phone,
  Cake,
  RefreshCw,
  Printer,
  CalendarDays,
  ChevronFirst,
  ChevronLast,
  UserCheck,
  Zap,
  Wifi,
  WifiOff,
  CloudOff,
  UserX,
  Eye,
} from "lucide-react";
import { format, addDays, subDays, isSameDay, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AgendamentoFormDialog from "@/components/agenda/AgendamentoFormDialog";
import { useAgendamentos, AgendamentoCompleto } from "@/hooks/useAgendamentos";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00",
];

// iOS Official Colors for Status
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  agendado: { label: "Agendado", color: "text-warning", bgColor: "bg-warning/15", icon: <Clock className="h-3 w-3" /> },
  confirmado: { label: "Confirmado", color: "text-success", bgColor: "bg-success/15", icon: <Check className="h-3 w-3" /> },
  atendido: { label: "Atendido", color: "text-primary", bgColor: "bg-primary/15", icon: <UserCheck className="h-3 w-3" /> },
  cancelado: { label: "Cancelado", color: "text-destructive", bgColor: "bg-destructive/15", icon: <X className="h-3 w-3" /> },
  faltou: { label: "Faltou", color: "text-muted-foreground", bgColor: "bg-muted", icon: <UserX className="h-3 w-3" /> },
};

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const Agenda = () => {
  const { session } = usePinAuth();
  const { can } = useUserPermissions();
  const isReadOnly = session?.role === 'colaborador_agenda' || !can('agenda.view');
  const canEncaixe = can('agenda.encaixe');
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [profissionalFilter, setProfissionalFilter] = useState<string>("todos");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoCompleto | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>();
  const [formInitialTime, setFormInitialTime] = useState<string | undefined>();
  const [formInitialProfissionalId, setFormInitialProfissionalId] = useState<string | undefined>();
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const { toast } = useToast();

  // Use offline-first hook
  const {
    agendamentos,
    profissionais,
    loading,
    isOnline,
    pendingSync,
    refetch,
    remove,
    confirmAppointment,
    cancelAppointment,
    markAttended,
    markNoShow,
  } = useAgendamentos({ date: selectedDate, profissionalId: profissionalFilter });

  const displayedProfissionais = useMemo(() => {
    if (profissionalFilter === "todos") return profissionais;
    return profissionais.filter(p => p.id === profissionalFilter);
  }, [profissionais, profissionalFilter]);

  // Estatísticas do dia
  const stats = useMemo(() => {
    const total = agendamentos.length;
    const confirmados = agendamentos.filter(a => a.status === "confirmado").length;
    const atendidos = agendamentos.filter(a => a.status === "atendido").length;
    const cancelados = agendamentos.filter(a => a.status === "cancelado").length;
    const faltaram = agendamentos.filter(a => a.status === "faltou").length;
    const vagasTotal = displayedProfissionais.length * timeSlots.length;
    const ocupadas = agendamentos.filter(a => a.status !== "cancelado" && a.status !== "faltou").length;
    const taxaOcupacao = vagasTotal > 0 ? Math.round((ocupadas / vagasTotal) * 100) : 0;
    
    return { total, confirmados, atendidos, cancelados, faltaram, vagasLivres: vagasTotal - ocupadas, taxaOcupacao };
  }, [agendamentos, displayedProfissionais]);

  // Navegação
  const goToToday = () => {
    setSelectedDate(new Date());
    setCalendarMonth(new Date());
  };
  const goToPrev = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNext = () => setSelectedDate(addDays(selectedDate, 1));
  const goToFirst = () => setSelectedDate(startOfMonth(selectedDate));
  const goToLast = () => setSelectedDate(endOfMonth(selectedDate));

  // Handlers
  const handleSlotClick = (time: string, profissionalId: string) => {
    setFormInitialDate(selectedDate);
    setFormInitialTime(time);
    setFormInitialProfissionalId(profissionalId);
    setSelectedAgendamento(null);
    setIsFormOpen(true);
  };

  const handleAgendamentoClick = (ag: AgendamentoCompleto) => {
    setOpenPopoverId(null);
    // Use requestAnimationFrame to ensure Popover fully unmounts before Dialog opens
    requestAnimationFrame(() => {
      setSelectedAgendamento(ag);
      setFormInitialDate(undefined);
      setFormInitialTime(undefined);
      setFormInitialProfissionalId(undefined);
      setIsFormOpen(true);
    });
  };

  // Auto-criar comanda ao confirmar agendamento
  const autoCreateComanda = async (ag: AgendamentoCompleto) => {
    try {
      const agDate = new Date(ag.data_hora);
      const inicioHoje = startOfDay(agDate).toISOString();
      const fimHoje = endOfDay(agDate).toISOString();

      // Verificar se o cliente já tem comanda aberta no dia
      const { data: comandasExistentes } = await supabase
        .from("atendimentos")
        .select("id, numero_comanda")
        .eq("status", "aberto")
        .eq("cliente_id", ag.cliente_id)
        .gte("data_hora", inicioHoje)
        .lte("data_hora", fimHoje);

      if (comandasExistentes && comandasExistentes.length > 0) {
        // Adicionar serviço à comanda existente
        const comanda = comandasExistentes[0];
        const servico = ag.servico;
        
        await supabase.from("atendimento_servicos").insert([{
          atendimento_id: comanda.id,
          servico_id: ag.servico_id,
          profissional_id: ag.profissional_id,
          quantidade: 1,
          preco_unitario: servico.preco,
          comissao_percentual: 0,
          comissao_valor: 0,
          subtotal: servico.preco,
        }]);
        
        toast({ title: `Serviço adicionado à Comanda #${comanda.numero_comanda.toString().padStart(3, "0")}` });
      } else {
        // Criar nova comanda com o serviço do agendamento
        const { data: novaComanda, error } = await supabase
          .from("atendimentos")
          .insert([{ cliente_id: ag.cliente_id, status: "aberto" }])
          .select("id, numero_comanda")
          .single();

        if (error || !novaComanda) {
          console.error("[Agenda] Erro ao criar comanda:", error);
          return;
        }

        // Adicionar serviço do agendamento
        const servico = ag.servico;
        await supabase.from("atendimento_servicos").insert([{
          atendimento_id: novaComanda.id,
          servico_id: ag.servico_id,
          profissional_id: ag.profissional_id,
          quantidade: 1,
          preco_unitario: servico.preco,
          comissao_percentual: 0,
          comissao_valor: 0,
          subtotal: servico.preco,
        }]);

        toast({ title: `Comanda #${novaComanda.numero_comanda.toString().padStart(3, "0")} criada automaticamente!` });
      }
    } catch (err) {
      console.error("[Agenda] Erro ao criar comanda automática:", err);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      switch (newStatus) {
        case 'confirmado':
          await confirmAppointment(id);
          // Auto-criar comanda ao confirmar
          const ag = agendamentos.find(a => a.id === id);
          if (ag) await autoCreateComanda(ag);
          break;
        case 'atendido':
          await markAttended(id);
          break;
        case 'cancelado':
          await cancelAppointment(id);
          break;
        case 'faltou':
          await markNoShow(id);
          break;
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
    setOpenPopoverId(null);
  };

  const handleDeleteClick = (ag: AgendamentoCompleto) => {
    setOpenPopoverId(null);
    requestAnimationFrame(() => {
      setSelectedAgendamento(ag);
      setIsDeleteOpen(true);
    });
  };

  const handleDelete = async () => {
    if (!selectedAgendamento) return;

    try {
      await remove(selectedAgendamento.id);
      toast({ title: "Agendamento excluído" });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsDeleteOpen(false);
    setSelectedAgendamento(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedAgendamento(null);
    setFormInitialDate(undefined);
    setFormInitialTime(undefined);
    setFormInitialProfissionalId(undefined);
    if (refresh) refetch();
  };

  // Verificar aniversário
  const isBirthday = (cliente: { data_nascimento: string | null }) => {
    if (!cliente.data_nascimento) return false;
    const today = new Date();
    const birth = parseISO(cliente.data_nascimento);
    return today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth();
  };

  // Obter agendamentos para um slot específico
  const getAgendamentosForSlot = (time: string, profissionalId: string) => {
    return agendamentos.filter(ag => {
      const agTime = format(new Date(ag.data_hora), "HH:mm");
      return agTime === time && ag.profissional_id === profissionalId;
    });
  };

  // Calcular horário de término
  const getEndTime = (startTime: string, duracao: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + duracao;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  };

  // Calcular slots ocupados para cada agendamento
  const getSlotsForAgendamento = (duracao: number) => Math.ceil(duracao / 30);

  // Verificar se slot está ocupado por agendamento anterior
  const isSlotOccupied = (time: string, profissionalId: string) => {
    const [slotH, slotM] = time.split(":").map(Number);
    const slotMinutes = slotH * 60 + slotM;
    
    return agendamentos.some(ag => {
      if (ag.profissional_id !== profissionalId) return false;
      const agTime = format(new Date(ag.data_hora), "HH:mm");
      const [agH, agM] = agTime.split(":").map(Number);
      const agStartMinutes = agH * 60 + agM;
      const agEndMinutes = agStartMinutes + ag.duracao_minutos;
      
      return slotMinutes > agStartMinutes && slotMinutes < agEndMinutes;
    });
  };

  // Dia da semana atual
  const currentDayIndex = selectedDate.getDay();
  const adjustedDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;

  // Função para renderizar os slots de horário
  const renderTimeSlots = (isMobile = false) => {
    const slotHeight = isMobile ? 40 : 48;
    const minWidth = isMobile ? 120 : 160;
    const timeColWidth = isMobile ? "w-12" : "w-16";

    return (
      <div className="relative">
        {timeSlots.map((time) => (
          <div key={time} className="flex border-b">
            <div className={cn(timeColWidth, "flex-shrink-0 px-1.5 flex items-center justify-end text-xs text-muted-foreground border-r bg-muted/30")} style={{ height: slotHeight }}>
              {time}
            </div>
            {displayedProfissionais.map((prof) => {
              const ags = getAgendamentosForSlot(time, prof.id);
              const isOccupied = isSlotOccupied(time, prof.id);

              return (
                <div
                  key={prof.id}
                  className={cn(
                    "flex-1 border-r relative",
                    !isReadOnly && !isOccupied && ags.length === 0 && "hover:bg-muted/50 cursor-pointer transition-colors"
                  )}
                  style={{ minWidth, height: slotHeight }}
                  onClick={() => {
                    if (!isReadOnly && !isOccupied && ags.length === 0) {
                      handleSlotClick(time, prof.id);
                    }
                  }}
                >
                  {ags.map((ag) => {
                    const slots = getSlotsForAgendamento(ag.duracao_minutos);
                    const startTime = format(new Date(ag.data_hora), "HH:mm");
                    const endTime = getEndTime(startTime, ag.duracao_minutos);
                    const isCancelled = ag.status === "cancelado";
                    const isFaltou = ag.status === "faltou";

                    return (
                      <Popover
                        key={ag.id}
                        open={openPopoverId === ag.id}
                        onOpenChange={(open) => setOpenPopoverId(open ? ag.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <div
                            className={cn(
                              "absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 cursor-pointer transition-all hover:shadow-lg z-10 overflow-hidden border-l-4",
                              isCancelled && "opacity-50 line-through",
                              isFaltou && "opacity-60"
                            )}
                            style={{
                              height: `${slots * slotHeight - 4}px`,
                              backgroundColor: `${ag.profissional.cor_agenda}cc`,
                              borderLeftColor: ag.profissional.cor_agenda,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-0.5">
                              <span className={cn("font-bold text-foreground truncate", isMobile ? "text-[10px]" : "text-xs")}>
                                {isMobile ? ag.cliente.nome.split(' ')[0] : ag.cliente.nome}
                              </span>
                              {isBirthday(ag.cliente) && <Cake className="h-2.5 w-2.5 text-pink-600 flex-shrink-0" />}
                              {ag.status === "confirmado" && <Check className="h-2.5 w-2.5 text-green-700 flex-shrink-0" />}
                              {ag.status === "atendido" && <UserCheck className="h-2.5 w-2.5 text-blue-700 flex-shrink-0" />}
                            </div>
                            <div className={cn("text-foreground/80", isMobile ? "text-[8px]" : "text-[10px]")}>
                              {startTime}-{endTime}
                            </div>
                            {slots > 1 && !isMobile && (
                              <div className="text-[10px] text-foreground/90 font-medium truncate">
                                {ag.servico.nome}
                              </div>
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent side={isMobile ? "bottom" : "right"} className="w-72 p-0" align="start">
                          <div className="p-3 space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-sm">{ag.cliente.nome}</span>
                                {isBirthday(ag.cliente) && <Cake className="h-4 w-4 text-pink-500" />}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{ag.cliente.celular || ag.cliente.telefone || "Sem telefone"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Scissors className="h-3 w-3" />
                                <span>{ag.servico.nome}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{startTime} às {endTime}</span>
                              </div>
                            </div>
                            <Badge className={cn("text-xs", statusConfig[ag.status].bgColor, statusConfig[ag.status].color)}>
                              {statusConfig[ag.status].icon}
                              <span className="ml-1">{statusConfig[ag.status].label}</span>
                            </Badge>
                            
                            {/* Status Actions - Hidden in read-only mode */}
                            {!isReadOnly && (
                            <div className="flex flex-wrap gap-1 pt-2 border-t">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAgendamentoClick(ag)}>
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              
                              {ag.status === "agendado" && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs text-success hover:text-success" 
                                    onClick={() => handleStatusUpdate(ag.id, "confirmado")}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirmar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs text-destructive hover:text-destructive" 
                                    onClick={() => handleStatusUpdate(ag.id, "cancelado")}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancelar
                                  </Button>
                                </>
                              )}
                              
                              {ag.status === "confirmado" && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs text-primary hover:text-primary" 
                                    onClick={() => handleStatusUpdate(ag.id, "atendido")}
                                  >
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Atendido
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs text-muted-foreground" 
                                    onClick={() => handleStatusUpdate(ag.id, "faltou")}
                                  >
                                    <UserX className="h-3 w-3 mr-1" />
                                    Faltou
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs text-destructive hover:text-destructive" 
                                    onClick={() => handleStatusUpdate(ag.id, "cancelado")}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              
                              {(ag.status === "cancelado" || ag.status === "faltou") && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs text-destructive hover:text-destructive" 
                                  onClick={() => handleDeleteClick(ag)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Excluir
                                </Button>
                              )}
                            </div>
                            )}
                            
                            {/* Read-only indicator */}
                            {isReadOnly && (
                              <div className="pt-2 border-t text-center">
                                <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Somente visualização
                                </span>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Sync status indicator
  const SyncIndicator = () => (
    <div className="flex items-center gap-1.5">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-success" />
      ) : (
        <WifiOff className="h-4 w-4 text-warning" />
      )}
      {pendingSync > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
          <CloudOff className="h-3 w-3 mr-1" />
          {pendingSync}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-3 lg:gap-4 overflow-hidden">
      {/* Mobile: Header com data e navegação */}
      <div className="lg:hidden">
        {/* Data e navegação compacta */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="text-xs px-2" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-sm font-bold capitalize truncate flex-1 text-center">
            {format(selectedDate, "EEE, dd MMM", { locale: ptBR })}
          </h2>

          <div className="flex items-center gap-1">
            <SyncIndicator />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Abas de dias da semana - Mobile */}
        <div className="flex gap-1 mb-3">
          {weekDays.map((day, idx) => (
            <Button
              key={day}
              variant={idx === adjustedDayIndex ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-8 px-1 text-xs"
              onClick={() => {
                const diff = idx - adjustedDayIndex;
                setSelectedDate(addDays(selectedDate, diff));
              }}
            >
              {day}
            </Button>
          ))}
        </div>

        {/* Botões Agendar e Encaixe - Mobile (hidden in read-only) */}
        {!isReadOnly && (
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-10"
            onClick={() => {
              setFormInitialDate(selectedDate);
              setFormInitialTime(undefined);
              setFormInitialProfissionalId(undefined);
              setSelectedAgendamento(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Agendar
          </Button>
          {/* Botão Encaixe - Mobile (hidden in read-only or no permission) */}
          {canEncaixe && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5 h-10 bg-accent hover:bg-accent/80 text-accent-foreground"
            onClick={() => {
              setFormInitialDate(selectedDate);
              setFormInitialTime(undefined);
              setFormInitialProfissionalId(undefined);
              setSelectedAgendamento(null);
              setIsFormOpen(true);
            }}
          >
            <Zap className="h-4 w-4" />
            Encaixe
          </Button>
          )}
        </div>
        )}
        
        {/* Read-only indicator for mobile */}
        {isReadOnly && (
          <div className="mb-3 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <p className="text-xs text-center text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              Modo somente leitura
            </p>
          </div>
        )}

        {/* Filtro e Stats - Mobile */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs flex-shrink-0">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {profissionais.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: prof.cor_agenda }} />
                    {prof.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="px-2 py-1 text-[10px] flex-shrink-0">
            {stats.total} agend.
          </Badge>
          <Badge variant="success" className="px-2 py-1 text-[10px] flex-shrink-0">
            {stats.confirmados} conf.
          </Badge>
        </div>
      </div>

      {/* Desktop: Layout com sidebar */}
      <div className="hidden lg:flex lg:flex-row flex-1 gap-4 min-h-0">
        {/* Coluna Esquerda - Mini Calendário */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-auto">
          {/* Botão Agendar - Em cima do calendário (hidden in read-only) */}
          {!isReadOnly ? (
          <Button
            size="lg"
            className="w-full gap-2 h-14 text-lg"
            onClick={() => {
              setFormInitialDate(selectedDate);
              setFormInitialTime(undefined);
              setFormInitialProfissionalId(undefined);
              setSelectedAgendamento(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Agendar
          </Button>
          ) : (
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm text-center text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1.5">
                <Eye className="h-4 w-4" />
                Modo somente leitura
              </p>
            </div>
          )}

          {/* Mini calendário */}
          <Card className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              locale={ptBR}
              className="pointer-events-auto"
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                row: "flex w-full mt-1",
                cell: "relative h-8 w-8 text-center text-sm p-0 focus-within:relative focus-within:z-20",
                day: cn(
                  "h-8 w-8 p-0 font-normal hover:bg-accent rounded-md transition-colors inline-flex items-center justify-center"
                ),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-bold",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
              }}
            />
          </Card>

          {/* Legenda */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium">Legenda</h3>
            <div className="space-y-1.5">
              {Object.entries(statusConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div className={cn("flex items-center justify-center w-5 h-5 rounded", config.bgColor, config.color)}>
                    {config.icon}
                  </div>
                  <span>{config.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Botão Encaixe - Abaixo da legenda - Hidden if no permission */}
          {canEncaixe && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full gap-2 h-14 text-lg bg-accent hover:bg-accent/80 text-accent-foreground shadow-md"
            onClick={() => {
              setFormInitialDate(selectedDate);
              setFormInitialTime(undefined);
              setFormInitialProfissionalId(undefined);
              setSelectedAgendamento(null);
              setIsFormOpen(true);
            }}
          >
            <Zap className="h-5 w-5" />
            Encaixe
          </Button>
          )}
        </div>

        {/* Coluna Direita - Grid de Agendamentos (Desktop) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header com navegação */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goToFirst}>
                <ChevronFirst className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goToPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goToLast}>
                <ChevronLast className="h-4 w-4" />
              </Button>
            </div>
            
            <h2 className="text-xl font-bold capitalize">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h2>

            <div className="flex items-center gap-2">
              <SyncIndicator />
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Abas de dias da semana */}
          <div className="flex gap-1 mb-4">
            {weekDays.map((day, idx) => (
              <Button
                key={day}
                variant={idx === adjustedDayIndex ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  const diff = idx - adjustedDayIndex;
                  setSelectedDate(addDays(selectedDate, diff));
                }}
              >
                {day}
              </Button>
            ))}
          </div>

          {/* Estatísticas + Filtro */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant="outline" className="px-3 py-1 text-xs">
              Total: {stats.total}
            </Badge>
            <Badge variant="success" className="px-3 py-1 text-xs">
              Confirmados: {stats.confirmados}
            </Badge>
            <Badge variant="info" className="px-3 py-1 text-xs">
              Atendidos: {stats.atendidos}
            </Badge>
            {stats.faltaram > 0 && (
              <Badge variant="outline" className="px-3 py-1 text-xs text-muted-foreground">
                Faltas: {stats.faltaram}
              </Badge>
            )}
            <Badge variant="outline" className="px-3 py-1 text-xs">
              Vagas: {stats.vagasLivres}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 text-xs">
              Ocupação: {stats.taxaOcupacao}%
            </Badge>
            
            <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Todos profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos profissionais</SelectItem>
                {profissionais.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prof.cor_agenda }} />
                      {prof.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid principal - Desktop */}
          <Card className="flex-1 overflow-hidden min-h-0">
            <div className="h-full overflow-auto">
              <div className="min-w-max">
                {/* Header com profissionais */}
                <div className="flex sticky top-0 bg-card z-10 border-b">
                  <div className="w-16 flex-shrink-0 p-2 border-r bg-muted/50 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {displayedProfissionais.map((prof) => (
                    <div
                      key={prof.id}
                      className="flex-1 min-w-[180px] px-3 py-3 text-center font-semibold border-r truncate"
                      style={{ 
                        backgroundColor: `${prof.cor_agenda}30`,
                        borderBottom: `3px solid ${prof.cor_agenda}`
                      }}
                      title={prof.nome}
                    >
                      {prof.nome}
                    </div>
                  ))}
                </div>
                {renderTimeSlots()}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile: Grid de Agendamentos */}
      <Card className="lg:hidden flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-auto">
          <div className="min-w-max">
            {/* Header com profissionais - Mobile */}
            <div className="flex sticky top-0 bg-card z-10 border-b">
              <div className="w-12 flex-shrink-0 p-1.5 border-r bg-muted/50 flex items-center justify-center">
                <Clock className="h-3 w-3 text-muted-foreground" />
              </div>
              {displayedProfissionais.map((prof) => (
                <div
                  key={prof.id}
                  className="flex-1 min-w-[120px] px-2 py-2 text-center font-semibold border-r text-xs truncate"
                  style={{ 
                    backgroundColor: `${prof.cor_agenda}30`,
                    borderBottom: `3px solid ${prof.cor_agenda}`
                  }}
                  title={prof.nome}
                >
                  {prof.nome.split(' ')[0]}
                </div>
              ))}
            </div>
            {renderTimeSlots(true)}
          </div>
        </div>
      </Card>

      {/* Modal de agendamento */}
      <AgendamentoFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        agendamento={selectedAgendamento}
        initialDate={formInitialDate}
        initialTime={formInitialTime}
        initialProfissionalId={formInitialProfissionalId}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agenda;
