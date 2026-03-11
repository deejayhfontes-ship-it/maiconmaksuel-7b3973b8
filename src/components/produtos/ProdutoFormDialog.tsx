import { useEffect, useState, useRef } from "react";
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
import { useProdutos, Produto } from "@/hooks/useProdutos";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import ImageUploadField from "@/components/common/ImageUploadField";

const categorias = [
  "Shampoo",
  "Condicionador",
  "Tintura",
  "Máscara",
  "Esmalte",
  "Creme",
  "Óleo",
  "Finalizador",
  "Bomboniere",
  "Conveniência",
  "Outros",
];

const produtoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  codigo_barras: z.string().max(50, "Máximo 50 caracteres").optional(),
  categoria: z.string().optional(),
  descricao: z.string().max(500, "Máximo 500 caracteres").optional(),
  preco_custo: z.number().min(0, "Preço não pode ser negativo").optional(),
  preco_venda: z.number().min(0.01, "Preço de venda é obrigatório"),
  estoque_atual: z.number().min(0, "Estoque não pode ser negativo"),
  estoque_minimo: z.number().min(0, "Estoque mínimo não pode ser negativo"),
  ativo: z.boolean(),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

interface ProdutoFormDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  produto: Produto | null;
}

export default function ProdutoFormDialog({
  open,
  onClose,
  produto,
}: ProdutoFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!produto;
  const [loading, setLoading] = useState(false);

  // Estado de imagem — gerenciado pelo ImageUploadField
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);   // URL externa (fallback CORS)
  const [fotoRemoved, setFotoRemoved] = useState(false);

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: "",
      codigo_barras: "",
      categoria: "",
      descricao: "",
      preco_custo: 0,
      preco_venda: 0,
      estoque_atual: 0,
      estoque_minimo: 5,
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (produto) {
        form.reset({
          nome: produto.nome,
          codigo_barras: produto.codigo_barras || "",
          categoria: produto.categoria || "",
          descricao: produto.descricao || "",
          preco_custo: Number(produto.preco_custo) || 0,
          preco_venda: Number(produto.preco_venda),
          estoque_atual: produto.estoque_atual,
          estoque_minimo: produto.estoque_minimo,
          ativo: produto.ativo,
        });
      } else {
        form.reset({
          nome: "",
          codigo_barras: "",
          categoria: "",
          descricao: "",
          preco_custo: 0,
          preco_venda: 0,
          estoque_atual: 0,
          estoque_minimo: 5,
          ativo: true,
        });
      }
      // Reset estado de imagem ao abrir
      setFotoFile(null);
      setFotoUrl(null);
      setFotoRemoved(false);
    }
  }, [produto, form, open]);

  /** Faz upload do File comprimido para o Supabase Storage */
  const uploadFotoFile = async (produtoId: string, file: File): Promise<string | null> => {
    const fileName = `produtos/${produtoId}.webp`;
    const { error } = await supabase.storage
      .from("clientes-fotos")
      .upload(fileName, file, { upsert: true, contentType: "image/webp" });

    if (error) {
      console.error("Erro upload produto foto:", error);
      return null;
    }

    const { data } = supabase.storage.from("clientes-fotos").getPublicUrl(fileName);
    // Adiciona cache-buster para forçar recarregamento após troca
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  /** Resolve a foto_url final a ser salva no banco */
  const resolveFotoUrl = async (produtoId: string): Promise<string | null> => {
    if (fotoRemoved) return null;
    if (fotoFile) return await uploadFotoFile(produtoId, fotoFile);
    if (fotoUrl) return fotoUrl;                       // URL externa (CORS fallback)
    return produto?.foto_url ?? null;                  // mantém a atual
  };

  const { createProduto, updateProduto } = useProdutos();

  const onSubmit = async (data: ProdutoFormData) => {
    setLoading(true);
    try {
      const payload = {
        nome: data.nome,
        codigo_barras: data.codigo_barras || null,
        categoria: data.categoria || null,
        descricao: data.descricao || null,
        preco_custo: data.preco_custo || null,
        preco_venda: data.preco_venda,
        estoque_atual: data.estoque_atual,
        estoque_minimo: data.estoque_minimo,
        ativo: data.ativo,
        foto_url: null as string | null,
      };

      if (isEditing && produto) {
        payload.foto_url = await resolveFotoUrl(produto.id);
        const result = await updateProduto(produto.id, payload);
        if (result) {
          toast({ title: "Produto atualizado!", description: "Dados salvos com sucesso." });
          onClose(true);
        }
      } else {
        const tempId = crypto.randomUUID();
        payload.foto_url = await resolveFotoUrl(tempId);
        const result = await createProduto(payload);
        if (result) {
          toast({ title: "Produto cadastrado!", description: "Novo produto adicionado." });
          onClose(true);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido.';
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Foto ── */}
            <ImageUploadField
              currentUrl={produto?.foto_url}
              fallbackIcon="package"
              label="Foto do produto"
              onFileReady={(file) => {
                setFotoFile(file);
                setFotoUrl(null);
                setFotoRemoved(false);
              }}
              onRemove={() => {
                setFotoFile(null);
                setFotoUrl(null);
                setFotoRemoved(true);
              }}
            />

            {/* ── Campos ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_barras"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <FormControl>
                      <Input placeholder="0000000000000" maxLength={50} {...field} />
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
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                  <FormItem className="col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do produto..."
                        rows={2}
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_custo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Custo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
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
                name="preco_venda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
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
                name="estoque_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Atual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
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
                name="estoque_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="5"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Status ── */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value ? "Produto ativo" : "Produto inativo"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* ── Botões ── */}
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
