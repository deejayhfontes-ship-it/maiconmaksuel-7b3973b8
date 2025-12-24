import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import { useState } from "react";

const categorias = [
  "Cabelo",
  "Barba",
  "Manicure",
  "Pedicure",
  "Estética",
  "Depilação",
  "Massagem",
  "Outros",
];

const servicoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  categoria: z.string().min(1, "Selecione uma categoria"),
  duracao_minutos: z.number().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  preco: z.number().min(0.01, "Preço deve ser maior que zero"),
  comissao_padrao: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  ativo: z.boolean(),
});

type ServicoFormData = z.infer<typeof servicoSchema>;

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  duracao_minutos: number;
  preco: number;
  comissao_padrao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ServicoFormDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  servico: Servico | null;
}

export default function ServicoFormDialog({
  open,
  onClose,
  servico,
}: ServicoFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!servico;
  const [loading, setLoading] = useState(false);

  const form = useForm<ServicoFormData>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      categoria: "",
      duracao_minutos: 30,
      preco: 0,
      comissao_padrao: 30,
      ativo: true,
    },
  });

  useEffect(() => {
    if (servico) {
      form.reset({
        nome: servico.nome,
        descricao: servico.descricao || "",
        categoria: servico.categoria || "",
        duracao_minutos: servico.duracao_minutos,
        preco: Number(servico.preco),
        comissao_padrao: Number(servico.comissao_padrao),
        ativo: servico.ativo,
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        categoria: "",
        duracao_minutos: 30,
        preco: 0,
        comissao_padrao: 30,
        ativo: true,
      });
    }
  }, [servico, form, open]);

  const onSubmit = async (data: ServicoFormData) => {
    setLoading(true);

    try {
      const payload = {
        nome: data.nome,
        descricao: data.descricao || null,
        categoria: data.categoria,
        duracao_minutos: data.duracao_minutos,
        preco: data.preco,
        comissao_padrao: data.comissao_padrao,
        ativo: data.ativo,
      };

      if (isEditing && servico) {
        const { error } = await supabase
          .from("servicos")
          .update(payload)
          .eq("id", servico.id);

        if (error) throw error;

        toast({
          title: "Serviço atualizado!",
          description: "Os dados foram salvos com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("servicos")
          .insert([payload]);

        if (error) throw error;

        toast({
          title: "Serviço cadastrado!",
          description: "Novo serviço adicionado com sucesso.",
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
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Serviço" : "Novo Serviço"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do serviço" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
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
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do serviço..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duracao_minutos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="50.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comissao_padrao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comissão Padrão (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value ? "Serviço ativo" : "Serviço inativo"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-success hover:bg-success/90">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
