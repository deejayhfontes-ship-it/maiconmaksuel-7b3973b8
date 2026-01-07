import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, Scissors, Package, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "cliente" | "profissional" | "servico" | "produto";
  title: string;
  subtitle: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const typeConfig = {
  cliente: {
    icon: User,
    label: "Clientes",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  profissional: {
    icon: Users,
    label: "Profissionais",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  servico: {
    icon: Scissors,
    label: "Serviços",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  produto: {
    icon: Package,
    label: "Produtos",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
};

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        
        // Buscar em paralelo
        const [clientesRes, profissionaisRes, servicosRes, produtosRes] = await Promise.all([
          supabase
            .from("clientes")
            .select("id, nome, celular, email")
            .or(`nome.ilike.${searchTerm},celular.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("profissionais")
            .select("id, nome, especialidade")
            .or(`nome.ilike.${searchTerm},especialidade.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("servicos")
            .select("id, nome, preco, categoria")
            .or(`nome.ilike.${searchTerm},categoria.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("produtos")
            .select("id, nome, codigo_barras, estoque_atual")
            .or(`nome.ilike.${searchTerm},codigo_barras.ilike.${searchTerm}`)
            .limit(5),
        ]);

        const allResults: SearchResult[] = [];

        // Clientes
        clientesRes.data?.forEach((c) => {
          allResults.push({
            id: c.id,
            type: "cliente",
            title: c.nome,
            subtitle: c.celular || c.email || "",
          });
        });

        // Profissionais
        profissionaisRes.data?.forEach((p) => {
          allResults.push({
            id: p.id,
            type: "profissional",
            title: p.nome,
            subtitle: p.especialidade || "Profissional",
          });
        });

        // Serviços
        servicosRes.data?.forEach((s) => {
          allResults.push({
            id: s.id,
            type: "servico",
            title: s.nome,
            subtitle: `R$ ${s.preco?.toFixed(2) || "0,00"}`,
          });
        });

        // Produtos
        produtosRes.data?.forEach((p) => {
          allResults.push({
            id: p.id,
            type: "produto",
            title: p.nome,
            subtitle: `Estoque: ${p.estoque_atual || 0}`,
          });
        });

        setResults(allResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex]
  );

  const handleSelect = (result: SearchResult) => {
    const routes: Record<string, string> = {
      cliente: `/clientes?search=${encodeURIComponent(result.title)}`,
      profissional: `/profissionais?search=${encodeURIComponent(result.title)}`,
      servico: `/servicos?search=${encodeURIComponent(result.title)}`,
      produto: `/produtos?search=${encodeURIComponent(result.title)}`,
    };
    
    navigate(routes[result.type]);
    onClose();
  };

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar clientes, serviços, produtos..."
            className="border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Results */}
        <ScrollArea className="max-h-80">
          {query.length < 2 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Digite para buscar clientes, serviços, produtos...</p>
              <p className="text-xs mt-2">Mínimo 2 caracteres</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedResults).map(([type, items]) => {
                const config = typeConfig[type as keyof typeof typeConfig];
                const Icon = config.icon;

                return (
                  <div key={type} className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Icon className={cn("h-3 w-3", config.color)} />
                      {config.label} ({items.length})
                    </div>
                    {items.map((result) => {
                      const currentIndex = flatIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center h-8 w-8 rounded-full",
                              isSelected ? "bg-primary-foreground/20" : config.bgColor
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                isSelected ? "text-primary-foreground" : config.color
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {highlightMatch(result.title)}
                            </p>
                            <p
                              className={cn(
                                "text-xs truncate",
                                isSelected
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {result.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 bg-muted/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded">↵</kbd>
              selecionar
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded">Esc</kbd>
            fechar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
