import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, User, UserPlus, X, Phone, Clock, Camera, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Cliente {
  id: string;
  nome: string;
  celular: string;
  cpf: string | null;
  foto_url: string | null;
  ultima_visita: string | null;
}

interface ClienteSelectorProps {
  selectedClienteId: string | null;
  selectedClienteNome?: string | null;
  onClienteChange: (clienteId: string) => void;
  clientes: { id: string; nome: string }[];
}

// Paleta de cores para avatares
const avatarColors = [
  "bg-red-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-cyan-500",
];

// Gera cor consistente baseada no nome
const getAvatarColor = (name: string): string => {
  const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[sum % avatarColors.length];
};

// Extrai iniciais do nome
const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Formata telefone
const formatPhone = (phone: string): string => {
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

// Destaca match na busca
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${query})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-primary/30 text-primary font-semibold rounded px-0.5">
        {part}
      </span>
    ) : (
      part
    )
  );
};

export function ClienteSelector({
  selectedClienteId,
  selectedClienteNome,
  onClienteChange,
  clientes,
}: ClienteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentClientes, setRecentClientes] = useState<Cliente[]>([]);
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteCelular, setNovoClienteCelular] = useState("");
  const [novoClienteCpf, setNovoClienteCpf] = useState("");
  const [novoClienteEmail, setNovoClienteEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Buscar últimos clientes atendidos
  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, celular, cpf, foto_url, ultima_visita")
        .eq("ativo", true)
        .not("ultima_visita", "is", null)
        .order("ultima_visita", { ascending: false })
        .limit(8);

      if (data) setRecentClientes(data);
    };
    fetchRecent();
  }, []);

  // Busca em tempo real
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const query = searchQuery.toLowerCase();
      
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, celular, cpf, foto_url, ultima_visita")
        .eq("ativo", true)
        .or(`nome.ilike.%${query}%,celular.ilike.%${query}%,cpf.ilike.%${query}%`)
        .order("nome")
        .limit(10);

      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCliente = (cliente: Cliente) => {
    onClienteChange(cliente.id);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleAnonimo = () => {
    onClienteChange("anonimo");
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleNovoCliente = async () => {
    if (!novoClienteNome.trim() || !novoClienteCelular.trim()) {
      toast({ title: "Preencha nome e telefone", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("clientes")
      .insert([{
        nome: novoClienteNome.trim(),
        celular: novoClienteCelular.trim(),
        cpf: novoClienteCpf.trim() || null,
        email: novoClienteEmail.trim() || null,
      }])
      .select("id")
      .single();

    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente cadastrado!" });
      onClienteChange(data.id);
      setIsNovoClienteOpen(false);
      setNovoClienteNome("");
      setNovoClienteCelular("");
      setNovoClienteCpf("");
      setNovoClienteEmail("");
      setIsOpen(false);
    }
    setSaving(false);
  };

  // Cliente selecionado atual
  const clienteAtual = useMemo(() => {
    if (!selectedClienteId || selectedClienteId === "anonimo") return null;
    return recentClientes.find((c) => c.id === selectedClienteId) ||
      searchResults.find((c) => c.id === selectedClienteId);
  }, [selectedClienteId, recentClientes, searchResults]);

  // Se já tem cliente selecionado, mostrar card do cliente
  if (selectedClienteId && selectedClienteId !== "anonimo") {
    const nome = clienteAtual?.nome || selectedClienteNome || "Cliente";
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/30">
            <AvatarImage src={clienteAtual?.foto_url || undefined} />
            <AvatarFallback className={cn("text-white font-bold", getAvatarColor(nome))}>
              {getInitials(nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{nome}</p>
            {clienteAtual?.celular && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhone(clienteAtual.celular)}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="flex-shrink-0"
          >
            Trocar
          </Button>
        </div>

        {/* Dropdown de troca com campo de busca */}
        {isOpen && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Campo de busca */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, CPF ou telefone..."
                  className="pl-10 h-11"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsOpen(false); setSearchQuery(""); }}
                className="h-11 w-11"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ClienteSelectorDropdown
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              inputRef={inputRef}
              dropdownRef={dropdownRef}
              isSearching={isSearching}
              searchResults={searchResults}
              recentClientes={recentClientes}
              onSelectCliente={handleSelectCliente}
              onAnonimo={handleAnonimo}
              onNovoCliente={() => setIsNovoClienteOpen(true)}
              highlightMatch={highlightMatch}
            />
          </div>
        )}

        <NovoClienteDialog
          isOpen={isNovoClienteOpen}
          onClose={() => setIsNovoClienteOpen(false)}
          nome={novoClienteNome}
          setNome={setNovoClienteNome}
          celular={novoClienteCelular}
          setCelular={setNovoClienteCelular}
          cpf={novoClienteCpf}
          setCpf={setNovoClienteCpf}
          email={novoClienteEmail}
          setEmail={setNovoClienteEmail}
          onSave={handleNovoCliente}
          saving={saving}
        />
      </div>
    );
  }

  // Modo anônimo selecionado
  if (selectedClienteId === "anonimo") {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Cliente Anônimo</p>
            <p className="text-sm text-muted-foreground">Sem cadastro</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
          >
            Trocar
          </Button>
        </div>

        {isOpen && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Campo de busca */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, CPF ou telefone..."
                  className="pl-10 h-11"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsOpen(false); setSearchQuery(""); }}
                className="h-11 w-11"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ClienteSelectorDropdown
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              inputRef={inputRef}
              dropdownRef={dropdownRef}
              isSearching={isSearching}
              searchResults={searchResults}
              recentClientes={recentClientes}
              onSelectCliente={handleSelectCliente}
              onAnonimo={handleAnonimo}
              onNovoCliente={() => setIsNovoClienteOpen(true)}
              highlightMatch={highlightMatch}
            />
          </div>
        )}

        <NovoClienteDialog
          isOpen={isNovoClienteOpen}
          onClose={() => setIsNovoClienteOpen(false)}
          nome={novoClienteNome}
          setNome={setNovoClienteNome}
          celular={novoClienteCelular}
          setCelular={setNovoClienteCelular}
          cpf={novoClienteCpf}
          setCpf={setNovoClienteCpf}
          email={novoClienteEmail}
          setEmail={setNovoClienteEmail}
          onSave={handleNovoCliente}
          saving={saving}
        />
      </div>
    );
  }

  // Nenhum cliente selecionado - mostrar seletor completo
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Cliente da Comanda</Label>

      {/* Campo de busca + botão anônimo */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="pl-10 h-12"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleAnonimo}
          className="h-12 px-4 gap-2"
        >
          <User className="h-4 w-4" />
          Anônimo
        </Button>
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div ref={dropdownRef}>
          <ClienteSelectorDropdown
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            inputRef={inputRef}
            dropdownRef={dropdownRef}
            isSearching={isSearching}
            searchResults={searchResults}
            recentClientes={recentClientes}
            onSelectCliente={handleSelectCliente}
            onAnonimo={handleAnonimo}
            onNovoCliente={() => setIsNovoClienteOpen(true)}
            highlightMatch={highlightMatch}
            showRecentChips
          />
        </div>
      )}

      <NovoClienteDialog
        isOpen={isNovoClienteOpen}
        onClose={() => setIsNovoClienteOpen(false)}
        nome={novoClienteNome}
        setNome={setNovoClienteNome}
        celular={novoClienteCelular}
        setCelular={setNovoClienteCelular}
        cpf={novoClienteCpf}
        setCpf={setNovoClienteCpf}
        email={novoClienteEmail}
        setEmail={setNovoClienteEmail}
        onSave={handleNovoCliente}
        saving={saving}
      />
    </div>
  );
}

// Componente de dropdown separado
interface DropdownProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  isSearching: boolean;
  searchResults: Cliente[];
  recentClientes: Cliente[];
  onSelectCliente: (cliente: Cliente) => void;
  onAnonimo: () => void;
  onNovoCliente: () => void;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  showRecentChips?: boolean;
}

function ClienteSelectorDropdown({
  searchQuery,
  isSearching,
  searchResults,
  recentClientes,
  onSelectCliente,
  onNovoCliente,
  highlightMatch,
  showRecentChips,
}: DropdownProps) {
  const hasSearch = searchQuery.length >= 2;

  return (
    <div className="space-y-4">
      {/* Chips de últimos atendidos */}
      {showRecentChips && recentClientes.length > 0 && !hasSearch && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Últimos atendidos
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentClientes.slice(0, 6).map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => onSelectCliente(cliente)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all hover:scale-105 min-w-[72px]"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={cliente.foto_url || undefined} />
                  <AvatarFallback className={cn("text-white text-sm font-semibold", getAvatarColor(cliente.nome))}>
                    {getInitials(cliente.nome)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate max-w-[64px]">
                  {cliente.nome.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultados da busca */}
      {hasSearch && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" />
              Resultados ({searchResults.length})
            </p>
          </div>
          <ScrollArea className="max-h-[240px]">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                Buscando...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => onSelectCliente(cliente)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={cliente.foto_url || undefined} />
                      <AvatarFallback className={cn("text-white font-semibold", getAvatarColor(cliente.nome))}>
                        {getInitials(cliente.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {highlightMatch(cliente.nome, searchQuery)}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {highlightMatch(formatPhone(cliente.celular), searchQuery)}
                      </p>
                      {cliente.ultima_visita && (
                        <p className="text-xs text-muted-foreground">
                          Última visita: {formatDistanceToNow(new Date(cliente.ultima_visita), { addSuffix: true, locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Lista de recentes quando não está buscando */}
      {!hasSearch && recentClientes.length > 0 && !showRecentChips && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Clientes recentes
            </p>
          </div>
          <ScrollArea className="max-h-[200px]">
            <div className="divide-y">
              {recentClientes.slice(0, 5).map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => onSelectCliente(cliente)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={cliente.foto_url || undefined} />
                    <AvatarFallback className={cn("text-white font-semibold text-sm", getAvatarColor(cliente.nome))}>
                      {getInitials(cliente.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(cliente.celular)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Botão cadastrar novo */}
      <Button
        variant="outline"
        onClick={onNovoCliente}
        className="w-full gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Cadastrar Novo Cliente
      </Button>
    </div>
  );
}

// Modal de novo cliente
interface NovoClienteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nome: string;
  setNome: (value: string) => void;
  celular: string;
  setCelular: (value: string) => void;
  cpf: string;
  setCpf: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}

function NovoClienteDialog({
  isOpen,
  onClose,
  nome,
  setNome,
  celular,
  setCelular,
  cpf,
  setCpf,
  email,
  setEmail,
  onSave,
  saving,
}: NovoClienteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Novo Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar placeholder */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div>
              <Label htmlFor="celular">Telefone *</Label>
              <Input
                id="celular"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF (opcional)</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving} className="flex-1 bg-success hover:bg-success/90">
              {saving ? "Salvando..." : "Salvar e Vincular"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
