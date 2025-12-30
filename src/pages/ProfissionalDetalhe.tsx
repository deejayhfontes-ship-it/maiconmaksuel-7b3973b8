import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Percent,
  Target,
  Receipt,
  UserCheck,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/ui/skeleton";
import ProfissionalFormDialog from "@/components/profissionais/ProfissionalFormDialog";
import ProfissionalValesTab from "@/components/vales/ProfissionalValesTab";
import { DualProgressCard } from "@/components/profissionais/ProgressBar";

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  funcao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  comissao_servicos: number;
  comissao_produtos: number;
  cor_agenda: string;
  foto_url: string | null;
  pode_vender_produtos: boolean;
  meta_servicos_mes: number;
  meta_produtos_mes: number;
  ativo: boolean;
  realizado_servicos?: number;
  realizado_produtos?: number;
}

const ProfissionalDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [valesAbertos, setValesAbertos] = useState(0);
  const { toast } = useToast();

  const mesAtual = format(new Date(), "MMMM/yyyy", { locale: ptBR });

  const fetchProfissional = async () => {
    if (!id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({ title: "Erro ao carregar profissional", variant: "destructive" });
      navigate("/profissionais");
    } else {
      setProfissional(data);
    }

    // Fetch vales abertos count
    const { count } = await supabase
      .from("vales")
      .select("*", { count: "exact", head: true })
      .eq("profissional_id", id)
      .eq("status", "aberto");

    setValesAbertos(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfissional();
  }, [id]);

  const getInitials = (nome: string) =>
    nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const formatEndereco = () => {
    if (!profissional) return null;
    const parts = [
      profissional.endereco,
      profissional.bairro,
      profissional.cidade,
      profissional.estado,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleEditClose = (refresh?: boolean) => {
    setIsEditOpen(false);
    if (refresh) fetchProfissional();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!profissional) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profissionais")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16 border-4" style={{ borderColor: profissional.cor_agenda }}>
            <AvatarImage src={profissional.foto_url || ""} />
            <AvatarFallback
              className="text-xl font-bold"
              style={{ backgroundColor: profissional.cor_agenda, color: "white" }}
            >
              {getInitials(profissional.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{profissional.nome}</h1>
              <Badge variant={profissional.ativo ? "success" : "destructive"}>
                {profissional.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{profissional.funcao || "Profissional"}</p>
          </div>
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="metas" className="gap-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="vales" className="gap-2 relative">
            <Receipt className="h-4 w-4" />
            Vales
            {valesAbertos > 0 && (
              <span
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: "#FF3B30" }}
              >
                {valesAbertos}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Informações */}
        <TabsContent value="info" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contato
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone</span>
                    <span>{profissional.telefone || "Não informado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF</span>
                    <span>{profissional.cpf || "Não informado"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Datas
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admissão</span>
                    <span>
                      {profissional.data_admissao
                        ? format(parseISO(profissional.data_admissao), "dd/MM/yyyy")
                        : "Não informado"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {formatEndereco() && (
              <Card className="border-0 shadow-sm md:col-span-2">
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Endereço
                  </h3>
                  <p className="text-sm">{formatEndereco()}</p>
                  {profissional.cep && (
                    <p className="text-sm text-muted-foreground mt-1">CEP: {profissional.cep}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm md:col-span-2">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Comissões
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{profissional.comissao_servicos}%</p>
                    <p className="text-sm text-muted-foreground">Serviços</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{profissional.comissao_produtos}%</p>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Metas */}
        <TabsContent value="metas" className="mt-6">
          <DualProgressCard
            metaServicos={profissional.meta_servicos_mes}
            realizadoServicos={profissional.realizado_servicos || 0}
            metaProdutos={profissional.meta_produtos_mes}
            realizadoProdutos={profissional.realizado_produtos || 0}
            mesReferencia={mesAtual}
          />
        </TabsContent>

        {/* Tab Vales */}
        <TabsContent value="vales" className="mt-6">
          <ProfissionalValesTab profissional={profissional} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ProfissionalFormDialog
        open={isEditOpen}
        onClose={handleEditClose}
        profissional={profissional}
      />
    </div>
  );
};

export default ProfissionalDetalhe;
