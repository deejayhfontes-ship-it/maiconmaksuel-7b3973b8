import { useEffect, useRef, useState, useCallback } from "react";
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
  FormDescription,
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
import { Loader2, AlertCircle, ClipboardList, Users, Percent } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import ImageUploadField from "@/components/common/ImageUploadField";

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
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  descricao: z.string().max(500, "Máximo 500 caracteres").optional(),
  categoria: z.string().optional(),
  duracao_minutos: z.number().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  preco: z.number().min(0, "Preço não pode ser negativo"),
  comissao_padrao: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  ativo: z.boolean(),
  tipo_servico: z.enum(["normal", "cortesia", "controle_interno"]),
  apenas_agenda: z.boolean(),
  gera_receita: z.boolean(),
  gera_comissao: z.boolean(),
  aparece_pdv: z.boolean(),
  valor_variavel: z.boolean().default(false),
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

  // Ref para sinalizar que estamos resetando o form (abertura/edição)
  // Assim o useEffect do tipoServico não sobrescreve os valores salvos
  const isResettingRef = useRef(false);

  // Estado de imagem
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoUrlExternal, setFotoUrlExternal] = useState<string | null>(null);
  const [fotoRemoved, setFotoRemoved] = useState(false);

  // Comissão individual por profissional
  interface ProfissionalLite { id: string; nome: string; }
  const [profissionais, setProfissionais] = useState<ProfissionalLite[]>([]);
  const [comissoesProfissionais, setComissoesProfissionais] = useState<Record<string, string>>({});
  const [loadingComissoes, setLoadingComissoes] = useState(false);

  // Carrega profissionais ativos
  const carregarProfissionais = useCallback(async () => {
    const { data } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (data) setProfissionais(data as ProfissionalLite[]);
  }, []);

  // Carrega comissões individuais salvas para o serviço
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const carregarComissoesProfissionais = useCallback(async (servicoId: string) => {
    setLoadingComissoes(true);
    try {
      const { data } = await db
        .from("servico_comissao_profissional")
        .select("profissional_id, percentual")
        .eq("servico_id", servicoId);
      if (data) {
        const mapa: Record<string, string> = {};
        (data as { profissional_id: string; percentual: number }[]).forEach((r) => {
          mapa[r.profissional_id] = String(r.percentual);
        });
        setComissoesProfissionais(mapa);
      }
    } finally {
      setLoadingComissoes(false);
    }
  }, [db]);

  // Salva comissões individuais para o serviço
  const salvarComissoesProfissionais = useCallback(async (servicoId: string) => {
    const registros = Object.entries(comissoesProfissionais)
      .filter(([, pct]) => pct !== "" && !isNaN(Number(pct)))
      .map(([profissionalId, pct]) => ({
        servico_id: servicoId,
        profissional_id: profissionalId,
        percentual: Number(pct),
      }));

    if (registros.length === 0) return;

    // Upsert: insere ou atualiza
    await db
      .from("servico_comissao_profissional")
      .upsert(registros, { onConflict: "servico_id,profissional_id" });
  }, [comissoesProfissionais, db]);

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
      gera_comissao: true,
      aparece_pdv: true,
      valor_variavel: false,
    },
  });

  const tipoServico = form.watch("tipo_servico");
  const isControleInterno = tipoServico === "controle_interno";
  const isCortesia = tipoServico === "cortesia";

  useEffect(() => {
    isResettingRef.current = true;
    if (servico) {
      form.reset({
        nome: servico.nome,
        descricao: servico.descricao || "",
        categoria: servico.categoria || "",
        duracao_minutos: servico.duracao_minutos,
        preco: Number(servico.preco),
        comissao_padrao: Number(servico.comissao_padrao),
        ativo: servico.ativo ?? true,
        tipo_servico: (servico.tipo_servico as "normal" | "cortesia" | "controle_interno") || "normal",
        apenas_agenda: servico.apenas_agenda ?? false,
        gera_receita: servico.gera_receita ?? true,
        gera_comissao: servico.gera_comissao ?? true,
        aparece_pdv: servico.aparece_pdv ?? true,
        valor_variavel: servico.valor_variavel ?? false,
      });
      // Carregar comissões individuais salvas
      carregarComissoesProfissionais(servico.id);
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
        valor_variavel: false,
      });
      setComissoesProfissionais({});
    }
    // Reset estado de foto ao abrir
    setFotoFile(null);
    setFotoUrlExternal(null);
    setFotoRemoved(false);
    // Aguarda um tick para que o watch do tipoServico não interfira
    setTimeout(() => { isResettingRef.current = false; }, 0);
  }, [servico, form, open, carregarComissoesProfissionais]);

  // Carrega profissionais ao abrir o dialog
  useEffect(() => {
    if (open) carregarProfissionais();
  }, [open, carregarProfissionais]);

  // Atualiza campos automaticamente baseado no tipo de serviço
  // Mas IGNORA quando o form esta sendo resetado (abertura de edicao)
  useEffect(() => {
    if (isResettingRef.current) return;
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

  /** Upload do arquivo de foto para o bucket */
  const uploadFotoServico = async (servicoId: string, file: File): Promise<string | null> => {
    const fileName = `servicos/${servicoId}.webp`;
    const { error } = await supabase.storage
      .from("clientes-fotos")
      .upload(fileName, file, { upsert: true, contentType: "image/webp" });
    if (error) { console.error("Erro upload serviço foto:", error); return null; }
    const { data } = supabase.storage.from("clientes-fotos").getPublicUrl(fileName);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  /** Resolve foto_url final */
  const resolveFotoUrl = async (servicoId: string): Promise<string | null> => {
    if (fotoRemoved) return null;
    if (fotoFile) return await uploadFotoServico(servicoId, fotoFile);
    if (fotoUrlExternal) return fotoUrlExternal;
    return servico?.foto_url ?? null;
  };

  const { createServico, updateServico } = useServicos();

  const onSubmit = async (data: ServicoFormData) => {
    setLoading(true);
    try {
      const basePayload = {
        nome: data.nome,
        descricao: data.descricao || null,
        categoria: data.categoria || null,
        duracao_minutos: data.duracao_minutos,
        preco: data.preco,
        comissao_padrao: data.comissao_padrao,
        ativo: data.ativo,
        tipo_servico: data.tipo_servico,
        apenas_agenda: data.apenas_agenda,
        gera_receita: data.gera_receita,
        gera_comissao: data.gera_comissao,
        aparece_pdv: data.aparece_pdv,
        foto_url: null as string | null,
      };

      if (isEditing && servico) {
        basePayload.foto_url = await resolveFotoUrl(servico.id);
        const result = await updateServico(servico.id, basePayload);
        if (result) {
          // Salvar comissões individuais por profissional
          await salvarComissoesProfissionais(servico.id);
          toast({ title: "Serviço atualizado!", description: "Os dados foram salvos com sucesso." });
          onClose(true);
        } else {
          toast({ title: "Erro ao atualizar", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        }
      } else {
        const tempId = crypto.randomUUID();
        basePayload.foto_url = await resolveFotoUrl(tempId);
        const result = await createServico(basePayload);
        if (result) {
          // Salvar comissões individuais por profissional
          await salvarComissoesProfissionais(result.id);
          toast({ title: "Serviço cadastrado!", description: "Novo serviço adicionado com sucesso." });
          onClose(true);
        } else {
          toast({ title: "Erro ao criar", description: "Não foi possível cadastrar o serviço.", variant: "destructive" });
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido.';
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: unknown) => {
    console.log('Form validation errors:', errors);
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
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
            {/* ── Foto do Serviço ── */}
            <ImageUploadField
              currentUrl={servico?.foto_url}
              fallbackIcon="scissors"
              label="Foto do serviço"
              onFileReady={(file) => {
                setFotoFile(file);
                setFotoUrlExternal(null);
                setFotoRemoved(false);
              }}
              onRemove={() => {
                setFotoFile(null);
                setFotoUrlExternal(null);
                setFotoRemoved(true);
              }}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do serviço" maxLength={100} {...field} />
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
                      maxLength={500}
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
              name="valor_variavel"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Preço de Valor Variável</FormLabel>
                    <FormDescription>
                      Permite alterar livremente o preço na comanda no momento do lançamento. O Preço Base acima funcionará apenas como sugestão.
                    </FormDescription>
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
              name="comissao_padrao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comissão Padrão (%) — aplicada quando não há % individual</FormLabel>
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

            {/* Comissão Individual por Profissional */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Comissão por Profissional</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Defina % individuais para cada profissional. Se deixado em branco, usa a comissão padrão acima.
              </p>
              {loadingComissoes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando profissionais...
                </div>
              ) : profissionais.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum profissional ativo cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {profissionais.map((prof) => (
                    <div key={prof.id} className="flex items-center gap-3">
                      <span className="text-sm flex-1 truncate">{prof.nome}</span>
                      <div className="flex items-center gap-1 w-28">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder="—"
                          className="h-8 text-sm"
                          value={comissoesProfissionais[prof.id] ?? ""}
                          onChange={(e) =>
                            setComissoesProfissionais((prev) => ({
                              ...prev,
                              [prof.id]: e.target.value,
                            }))
                          }
                        />
                        <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
