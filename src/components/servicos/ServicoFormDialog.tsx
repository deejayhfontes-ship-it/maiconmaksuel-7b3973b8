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
import { useServicos, Servico } from "@/hooks/useServicos";
import { Loader2, AlertCircle, ClipboardList } from "lucide-react";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
  categoria: z.string().optional(),
  duracao_minutos: z.number().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  preco: z.number().min(0, "Preço inválido"),
  comissao_padrao: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  ativo: z.boolean(),
  tipo_servico: z.enum(["normal", "cortesia", "controle_interno"]),
  apenas_agenda: z.boolean(),
  gera_receita: z.boolean(),
  gera_comissao: z.boolean(),
  aparece_pdv: z.boolean(),
});

type ServicoFormData = z.infer<typeof servicoSchema>;

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
      tipo_servico: "normal",
      apenas_agenda: false,
      gera_receita: true,
      gera_comissao: true,
      aparece_pdv: true,
    },
  });

  const tipoServico = form.watch("tipo_servico");
  const isControleInterno = tipoServico === "controle_interno";
  const isCortesia = tipoServico === "cortesia";

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
        tipo_servico: (servico.tipo_servico as "normal" | "cortesia" | "controle_interno") || "normal",
        apenas_agenda: servico.apenas_agenda ?? false,
        gera_receita: servico.gera_receita ?? true,
        gera_comissao: servico.gera_comissao ?? true,
        aparece_pdv: servico.aparece_pdv ?? true,
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
        tipo_servico: "normal",
        apenas_agenda: false,
        gera_receita: true,
        gera_comissao: true,
        aparece_pdv: true,
      });
    }
  }, [servico, form, open]);

  // Atualiza campos automaticamente baseado no tipo de serviço
  useEffect(() => {
    if (tipoServico === "controle_interno") {
      form.setValue("apenas_agenda", true);
      form.setValue("gera_receita", false);
      form.setValue("gera_comissao", false);
      form.setValue("aparece_pdv", false);
    } else if (tipoServico === "cortesia") {
      form.setValue("apenas_agenda", false);
      form.setValue("gera_receita", false);
      form.setValue("gera_comissao", false);
      form.setValue("aparece_pdv", true);
    } else {
      form.setValue("apenas_agenda", false);
      form.setValue("gera_receita", true);
      form.setValue("gera_comissao", true);
      form.setValue("aparece_pdv", true);
    }
  }, [tipoServico, form]);

  const { createServico, updateServico } = useServicos();

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
        tipo_servico: data.tipo_servico,
        apenas_agenda: data.apenas_agenda,
        gera_receita: data.gera_receita,
        gera_comissao: data.gera_comissao,
        aparece_pdv: data.aparece_pdv,
      };

      if (isEditing && servico) {
        const result = await updateServico(servico.id, payload);
        if (result) {
          toast({
            title: "Serviço atualizado!",
            description: "Os dados foram salvos com sucesso.",
          });
          onClose(true);
        }
      } else {
        const result = await createServico(payload);
        if (result) {
          toast({
            title: "Serviço cadastrado!",
            description: "Novo serviço adicionado com sucesso.",
          });
          onClose(true);
        }
      }
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
      <DialogContent className="max-w-[540px] max-h-[90vh] overflow-y-auto">
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
                    <FormLabel>Preço (R$)</FormLabel>
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

            <Separator className="my-4" />

            {/* Configurações Financeiras */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Configurações Financeiras
              </h3>

              <FormField
                control={form.control}
                name="tipo_servico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid gap-2"
                      >
                        <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="normal" id="tipo-normal" />
                          <Label htmlFor="tipo-normal" className="flex-1 cursor-pointer">
                            <span className="font-medium">Normal</span>
                            <p className="text-xs text-muted-foreground">
                              Contabiliza tudo (receita, comissão, PDV)
                            </p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="cortesia" id="tipo-cortesia" />
                          <Label htmlFor="tipo-cortesia" className="flex-1 cursor-pointer">
                            <span className="font-medium">Cortesia</span>
                            <p className="text-xs text-muted-foreground">
                              Aparece no PDV, mas não cobra valor
                            </p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 rounded-lg border border-warning/30 bg-warning/5 p-3 hover:bg-warning/10 transition-colors">
                          <RadioGroupItem value="controle_interno" id="tipo-controle" />
                          <Label htmlFor="tipo-controle" className="flex-1 cursor-pointer">
                            <span className="font-medium flex items-center gap-2">
                              Controle Interno
                              <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                                APENAS AGENDA
                              </span>
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Apenas para controle de agenda, sem contabilização
                            </p>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Aviso para Controle Interno */}
              {isControleInterno && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Este serviço:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• Aparece apenas na agenda</li>
                        <li>• NÃO gera receita</li>
                        <li>• NÃO calcula comissão</li>
                        <li>• NÃO aparece no PDV</li>
                        <li>• NÃO conta para metas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {isCortesia && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Este serviço:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• Aparece na agenda e no PDV</li>
                        <li>• NÃO gera receita</li>
                        <li>• NÃO calcula comissão</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Opções avançadas - somente para tipo normal */}
              {!isControleInterno && !isCortesia && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">Opções avançadas:</p>
                  
                  <FormField
                    control={form.control}
                    name="gera_receita"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm">Gera receita no financeiro</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="gera_comissao"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm">Calcula comissão para profissional</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="aparece_pdv"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm">Aparece no PDV/Caixa</FormLabel>
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
                </div>
              )}
            </div>

            <Separator className="my-4" />

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
