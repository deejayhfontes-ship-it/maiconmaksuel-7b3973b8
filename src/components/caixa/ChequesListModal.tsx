import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  X,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Edit,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChequeFormModal } from "./ChequeFormModal";

interface ChequesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixaId?: string;
}

interface Cheque {
  id: string;
  numero_cheque: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  emitente: string;
  cpf_cnpj_emitente: string | null;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  data_compensacao: string | null;
  data_devolucao: string | null;
  motivo_devolucao: string | null;
  status: string;
  observacoes: string | null;
  cliente_id: string | null;
  clientes?: { nome: string } | null;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "pendente":
      return { label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-700" };
    case "compensado":
      return { label: "Compensado", icon: CheckCircle, color: "bg-green-100 text-green-700" };
    case "devolvido":
      return { label: "Devolvido", icon: XCircle, color: "bg-red-100 text-red-700" };
    case "reapresentado":
      return { label: "Reapresentado", icon: RefreshCw, color: "bg-blue-100 text-blue-700" };
    default:
      return { label: status, icon: Clock, color: "bg-gray-100 text-gray-700" };
  }
};

export function ChequesListModal({ open, onOpenChange, caixaId }: ChequesListModalProps) {
  const { toast } = useToast();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chequeToDelete, setChequeToDelete] = useState<Cheque | null>(null);

  const fetchCheques = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("cheques")
      .select("*, clientes(nome)")
      .order("data_vencimento", { ascending: true });

    if (statusFilter !== "todos") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Erro ao carregar cheques", variant: "destructive" });
    } else {
      setCheques(data || []);
    }
    setLoading(false);
  }, [statusFilter, toast]);

  useEffect(() => {
    if (open) {
      fetchCheques();
    }
  }, [open, fetchCheques]);

  const handleEdit = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedCheque(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!chequeToDelete) return;

    const { error } = await supabase
      .from("cheques")
      .delete()
      .eq("id", chequeToDelete.id);

    if (error) {
      toast({ title: "Erro ao excluir cheque", variant: "destructive" });
    } else {
      toast({ title: "Cheque excluído!" });
      fetchCheques();
    }
    setDeleteDialogOpen(false);
    setChequeToDelete(null);
  };

  const handleChangeStatus = async (cheque: Cheque, newStatus: string) => {
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === "compensado") {
      updateData.data_compensacao = format(new Date(), "yyyy-MM-dd");
    } else if (newStatus === "devolvido") {
      updateData.data_devolucao = format(new Date(), "yyyy-MM-dd");
    }

    const { error } = await supabase
      .from("cheques")
      .update(updateData)
      .eq("id", cheque.id);

    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      fetchCheques();
    }
  };

  const filteredCheques = cheques.filter(
    (c) =>
      c.emitente.toLowerCase().includes(search.toLowerCase()) ||
      c.numero_cheque.toLowerCase().includes(search.toLowerCase()) ||
      (c.banco && c.banco.toLowerCase().includes(search.toLowerCase()))
  );

  const totais = {
    pendente: cheques.filter((c) => c.status === "pendente").reduce((acc, c) => acc + Number(c.valor), 0),
    compensado: cheques.filter((c) => c.status === "compensado").reduce((acc, c) => acc + Number(c.valor), 0),
    devolvido: cheques.filter((c) => c.status === "devolvido").reduce((acc, c) => acc + Number(c.valor), 0),
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Gestão de Cheques
            </DialogTitle>
          </DialogHeader>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold text-yellow-700">{formatPrice(totais.pendente)}</p>
              <p className="text-xs text-muted-foreground">
                {cheques.filter((c) => c.status === "pendente").length} cheques
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Compensados</p>
              <p className="text-xl font-bold text-green-700">{formatPrice(totais.compensado)}</p>
              <p className="text-xs text-muted-foreground">
                {cheques.filter((c) => c.status === "compensado").length} cheques
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Devolvidos</p>
              <p className="text-xl font-bold text-red-700">{formatPrice(totais.devolvido)}</p>
              <p className="text-xs text-muted-foreground">
                {cheques.filter((c) => c.status === "devolvido").length} cheques
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por emitente, número ou banco..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="compensado">Compensados</SelectItem>
                <SelectItem value="devolvido">Devolvidos</SelectItem>
                <SelectItem value="reapresentado">Reapresentados</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cheque
            </Button>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredCheques.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cheque encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCheques.map((cheque) => {
                const statusConfig = getStatusConfig(cheque.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={cheque.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">Cheque #{cheque.numero_cheque}</p>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cheque.emitente}
                          {cheque.banco && ` • ${cheque.banco}`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Vence: {format(parseISO(cheque.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold">{formatPrice(cheque.valor)}</p>

                      <div className="flex gap-1">
                        {cheque.status === "pendente" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleChangeStatus(cheque, "compensado")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleChangeStatus(cheque, "devolvido")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {cheque.status === "devolvido" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600"
                            onClick={() => handleChangeStatus(cheque, "reapresentado")}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(cheque)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            setChequeToDelete(cheque);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ChequeFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cheque={selectedCheque}
        caixaId={caixaId}
        onSuccess={fetchCheques}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cheque?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cheque #{chequeToDelete?.numero_cheque} será
              excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}