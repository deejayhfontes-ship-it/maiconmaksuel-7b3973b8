import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarIcon, Check, ChevronsUpDown, Plus, Clock, DollarSign, Percent } from "lucide-react";
import { format, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const agendamentoSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  profissional_id: z.string().min(1, "Selecione um profissional"),
  servico_id: z.string().min(1, "Selecione um serviço"),
  data: z.date({ required_error: "Selecione uma data" }),
  hora: z.string().min(1, "Selecione um horário"),
  duracao_minutos: z.number().min(5, "Mínimo 5 minutos"),
  observacoes: z.string().optional(),
  status: z.string().optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

interface Cliente {
  id: string;
  nome: string;
  celular: string;
}

interface Profissional {
  id: string;
  nome: string;
  cor_agenda: string;
}

interface Servico {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
  comissao_padrao: number;
}

interface Agendamento {
  id: string;
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  data_hora: string;
  duracao_minutos: number;
  status: string;
  observacoes: string | null;
}

interface AgendamentoFormDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  agendamento?: Agendamento | null;
  initialDate?: Date;
  initialTime?: string;
  initialProfissionalId?: string;
}

const horarios = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

// iOS Colors for Status
const statusOptions = [
  { value: "agendado", label: "Agendado", color: "text-warning" },
  { value: "confirmado", label: "Confirmado", color: "text-success" },
  { value: "atendido", label: "Atendido", color: "text-primary" },
  { value: "cancelado", label: "Cancelado", color: "text-destructive" },
  { value: "faltou", label: "Faltou", color: "text-muted-foreground" },
];

export default function AgendamentoFormDialog({
  open,
  onClose,
  agendamento,
  initialDate,
  initialTime,
  initialProfissionalId,
}: AgendamentoFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!agendamento;
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState<any[]>([]);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
  const [enviarSMS, setEnviarSMS] = useState(false);

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      cliente_id: "",
      profissional_id: "",
      servico_id: "",
      data: undefined,
      hora: "",
      duracao_minutos: 30,
      observacoes: "",
      status: "agendado",
    },
  });

  const watchedProfissionalId = form.watch("profissional_id");
  const watchedData = form.watch("data");

  useEffect(() => {
    const fetchData = async () => {
      const [clientesRes, profissionaisRes, servicosRes] = await Promise.all([
        supabase.from("clientes").select("id, nome, celular").eq("ativo", true).order("nome"),
        supabase.from("profissionais").select("id, nome, cor_agenda").eq("ativo", true).order("nome"),
        supabase.from("servicos").select("id, nome, duracao_minutos, preco, comissao_padrao").eq("ativo", true).order("nome"),
      ]);

      if (clientesRes.data) setClientes(clientesRes.data);
      if (profissionaisRes.data) setProfissionais(profissionaisRes.data);
      if (servicosRes.data) setServicos(servicosRes.data);
    };

    if (open) {
      fetchData();
      setEnviarSMS(false);
    }
  }, [open]);

  // Buscar agendamentos existentes quando profissional ou data mudam
  useEffect(() => {
    const fetchAgendamentosExistentes = async () => {
      if (!watchedProfissionalId || !watchedData) {
        setAgendamentosExistentes([]);
        return;
      }

      const startDate = new Date(watchedData);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(watchedData);
      endDate.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("agendamentos")
        .select("id, data_hora, duracao_minutos")
        .eq("profissional_id", watchedProfissionalId)
        .gte("data_hora", startDate.toISOString())
        .lte("data_hora", endDate.toISOString())
        .neq("status", "cancelado");

      setAgendamentosExistentes(data || []);
    };

    fetchAgendamentosExistentes();
  }, [watchedProfissionalId, watchedData]);

  useEffect(() => {
    if (agendamento && servicos.length > 0) {
      const dataHora = new Date(agendamento.data_hora);
      const serv = servicos.find(s => s.id === agendamento.servico_id);
      setSelectedServico(serv || null);
      
      form.reset({
        cliente_id: agendamento.cliente_id,
        profissional_id: agendamento.profissional_id,
        servico_id: agendamento.servico_id,
        data: dataHora,
        hora: format(dataHora, "HH:mm"),
        duracao_minutos: agendamento.duracao_minutos,
        observacoes: agendamento.observacoes || "",
        status: agendamento.status,
      });
    } else if (!agendamento) {
      form.reset({
        cliente_id: "",
        profissional_id: initialProfissionalId || "",
        servico_id: "",
        data: initialDate || new Date(),
        hora: initialTime || "",
        duracao_minutos: 30,
        observacoes: "",
        status: "agendado",
      });
      setSelectedServico(null);
    }
  }, [agendamento, form, open, initialDate, initialTime, initialProfissionalId, servicos]);

  const horariosDisponiveis = useMemo(() => {
    return horarios.map(hora => {
      const [h, m] = hora.split(":").map(Number);
      
      // Verificar se está ocupado
      const isOcupado = agendamentosExistentes.some(ag => {
        if (isEditing && ag.id === agendamento?.id) return false;
        
        const agHora = new Date(ag.data_hora);
        const agStart = agHora.getHours() * 60 + agHora.getMinutes();
        const agEnd = agStart + ag.duracao_minutos;
        const slotStart = h * 60 + m;
        const slotEnd = slotStart + 30;
        
        return (slotStart >= agStart && slotStart < agEnd) || 
               (slotEnd > agStart && slotEnd <= agEnd) ||
               (slotStart <= agStart && slotEnd >= agEnd);
      });

      return { hora, isOcupado };
    });
  }, [agendamentosExistentes, isEditing, agendamento]);

  const handleServicoChange = (servicoId: string) => {
    form.setValue("servico_id", servicoId);
    const serv = servicos.find(s => s.id === servicoId);
    setSelectedServico(serv || null);
    if (serv) {
      form.setValue("duracao_minutos", serv.duracao_minutos);
    }
  };

  const validateConflito = (data: AgendamentoFormData): string | null => {
    if (!data.data || !data.hora || !data.profissional_id) return null;

    const [h, m] = data.hora.split(":").map(Number);
    const novoStart = h * 60 + m;
    const novoEnd = novoStart + data.duracao_minutos;

    for (const ag of agendamentosExistentes) {
      if (isEditing && ag.id === agendamento?.id) continue;

      const agHora = new Date(ag.data_hora);
      const agStart = agHora.getHours() * 60 + agHora.getMinutes();
      const agEnd = agStart + ag.duracao_minutos;

      if ((novoStart >= agStart && novoStart < agEnd) ||
          (novoEnd > agStart && novoEnd <= agEnd) ||
          (novoStart <= agStart && novoEnd >= agEnd)) {
        return `Conflito de horário! Já existe agendamento das ${format(agHora, "HH:mm")} às ${Math.floor(agEnd / 60).toString().padStart(2, "0")}:${(agEnd % 60).toString().padStart(2, "0")}`;
      }
    }

    return null;
  };

  const onSubmit = async (data: AgendamentoFormData) => {
    // Validar conflitos
    const conflito = validateConflito(data);
    if (conflito) {
      toast({
        title: "Conflito de horário",
        description: conflito,
        variant: "destructive",
      });
      return;
    }

    // Validar horário comercial
    const [h] = data.hora.split(":").map(Number);
    if (h < 8 || h >= 20) {
      toast({
        title: "Horário inválido",
        description: "O horário deve ser entre 08:00 e 20:00",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dataHora = new Date(data.data);
      const [hora, minuto] = data.hora.split(":").map(Number);
      dataHora.setHours(hora, minuto, 0, 0);
      
      const payload: any = {
        cliente_id: data.cliente_id,
        profissional_id: data.profissional_id,
        servico_id: data.servico_id,
        data_hora: dataHora.toISOString(),
        duracao_minutos: data.duracao_minutos,
        observacoes: data.observacoes || null,
      };

      if (isEditing) {
        payload.status = data.status;
      }

      if (isEditing && agendamento) {
        const { error } = await supabase
          .from("agendamentos")
          .update(payload)
          .eq("id", agendamento.id);

        if (error) throw error;

        toast({
          title: "Agendamento atualizado!",
          description: "Os dados foram salvos com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("agendamentos")
          .insert([payload]);

        if (error) throw error;

        toast({
          title: "Agendamento criado!",
          description: "Novo agendamento adicionado com sucesso.",
        });
      }

      if (enviarSMS) {
        toast({
          title: "SMS enviado!",
          description: "Confirmação enviada para o cliente.",
        });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCliente = clientes.find(c => c.id === form.watch("cliente_id"));
  const selectedProfissional = profissionais.find(p => p.id === form.watch("profissional_id"));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cliente com autocomplete */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cliente *</FormLabel>
                  <div className="flex gap-2">
                    <Popover open={clienteSearchOpen} onOpenChange={setClienteSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "flex-1 justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedCliente?.nome || "Selecione um cliente"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clientes.map((cliente) => (
                                <CommandItem
                                  key={cliente.id}
                                  value={cliente.nome}
                                  onSelect={() => {
                                    form.setValue("cliente_id", cliente.id);
                                    setClienteSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === cliente.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium">{cliente.nome}</p>
                                    <p className="text-xs text-muted-foreground">{cliente.celular}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" size="icon" title="Novo Cliente">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Profissional */}
            <FormField
              control={form.control}
              name="profissional_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional">
                          {selectedProfissional && (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: selectedProfissional.cor_agenda }}
                              />
                              {selectedProfissional.nome}
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profissionais.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: prof.cor_agenda }}
                            />
                            {prof.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Serviço */}
            <FormField
              control={form.control}
              name="servico_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço *</FormLabel>
                  <Select onValueChange={handleServicoChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Info do serviço selecionado */}
            {selectedServico && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedServico.duracao_minutos} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">
                    R$ {Number(selectedServico.preco).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span>{Number(selectedServico.comissao_padrao)}% comissão</span>
                </div>
              </div>
            )}

            {/* Data e Horário */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                          locale={ptBR}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          modifiers={{
                            today: new Date(),
                          }}
                          modifiersStyles={{
                            today: { fontWeight: "bold", border: "2px solid hsl(var(--primary))" },
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Horário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {horariosDisponiveis.map(({ hora, isOcupado }) => (
                          <SelectItem 
                            key={hora} 
                            value={hora}
                            disabled={isOcupado}
                            className={isOcupado ? "text-muted-foreground" : ""}
                          >
                            <div className="flex items-center gap-2">
                              {hora}
                              {isOcupado && (
                                <span className="text-xs text-destructive">(Ocupado)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duração */}
            <FormField
              control={form.control}
              name="duracao_minutos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        className="w-24"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">minutos</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status (só ao editar) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <span className={status.color}>{status.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o agendamento..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SMS Confirmação */}
            <div className="flex items-center space-x-2 p-3 rounded-lg border">
              <Checkbox 
                id="sms" 
                checked={enviarSMS} 
                onCheckedChange={(checked) => setEnviarSMS(checked as boolean)}
              />
              <label
                htmlFor="sms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Enviar SMS de confirmação para o cliente
              </label>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-success hover:bg-success/90">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
