import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const agendamentoSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  profissional_id: z.string().min(1, "Selecione um profissional"),
  servico_id: z.string().min(1, "Selecione um serviço"),
  data: z.string().min(1, "Selecione uma data"),
  hora: z.string().min(1, "Selecione um horário"),
  observacoes: z.string().optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

interface Cliente {
  id: string;
  nome: string;
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
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      cliente_id: "",
      profissional_id: "",
      servico_id: "",
      data: "",
      hora: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [clientesRes, profissionaisRes, servicosRes] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("profissionais").select("id, nome, cor_agenda").eq("ativo", true).order("nome"),
        supabase.from("servicos").select("id, nome, duracao_minutos, preco").eq("ativo", true).order("nome"),
      ]);

      if (clientesRes.data) setClientes(clientesRes.data);
      if (profissionaisRes.data) setProfissionais(profissionaisRes.data);
      if (servicosRes.data) setServicos(servicosRes.data);
    };

    if (open) fetchData();
  }, [open]);

  useEffect(() => {
    if (agendamento) {
      const dataHora = new Date(agendamento.data_hora);
      form.reset({
        cliente_id: agendamento.cliente_id,
        profissional_id: agendamento.profissional_id,
        servico_id: agendamento.servico_id,
        data: format(dataHora, "yyyy-MM-dd"),
        hora: format(dataHora, "HH:mm"),
        observacoes: agendamento.observacoes || "",
      });
      const serv = servicos.find(s => s.id === agendamento.servico_id);
      setSelectedServico(serv || null);
    } else {
      form.reset({
        cliente_id: "",
        profissional_id: initialProfissionalId || "",
        servico_id: "",
        data: initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        hora: initialTime || "",
        observacoes: "",
      });
      setSelectedServico(null);
    }
  }, [agendamento, form, open, initialDate, initialTime, initialProfissionalId, servicos]);

  const handleServicoChange = (servicoId: string) => {
    form.setValue("servico_id", servicoId);
    const serv = servicos.find(s => s.id === servicoId);
    setSelectedServico(serv || null);
  };

  const onSubmit = async (data: AgendamentoFormData) => {
    if (!selectedServico) return;

    setLoading(true);

    try {
      const dataHora = new Date(`${data.data}T${data.hora}:00`);
      
      const payload = {
        cliente_id: data.cliente_id,
        profissional_id: data.profissional_id,
        servico_id: data.servico_id,
        data_hora: dataHora.toISOString(),
        duracao_minutos: selectedServico.duracao_minutos,
        observacoes: data.observacoes || null,
      };

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

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profissional_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional" />
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
                          {servico.nome} ({servico.duracao_minutos}min - R$ {Number(servico.preco).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                        {horarios.map((hora) => (
                          <SelectItem key={hora} value={hora}>
                            {hora}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedServico && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><strong>Duração:</strong> {selectedServico.duracao_minutos} minutos</p>
                <p><strong>Valor:</strong> R$ {Number(selectedServico.preco).toFixed(2)}</p>
              </div>
            )}

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
