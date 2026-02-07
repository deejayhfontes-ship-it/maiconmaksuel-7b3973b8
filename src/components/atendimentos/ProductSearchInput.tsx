import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Package, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
  codigo_barras?: string | null;
  categoria?: string | null;
}

interface ProductSearchInputProps {
  produtos: Produto[];
  selectedProdutoId: string;
  onProductSelect: (id: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export function ProductSearchInput({
  produtos,
  selectedProdutoId,
  onProductSelect,
  onClear,
  disabled = false,
  placeholder = "Digite nome, código de barras...",
}: ProductSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected product name for display
  const selectedProduct = useMemo(() => 
    produtos.find(p => p.id === selectedProdutoId),
    [produtos, selectedProdutoId]
  );

  // Debounced search results
  const [debouncedResults, setDebouncedResults] = useState<Produto[]>([]);

  // Search function
  const searchProducts = useCallback((term: string): Produto[] => {
    if (!term.trim()) return [];
    
    const lower = term.toLowerCase().trim();
    
    // Filter by name, barcode, or category
    return produtos.filter((p) => {
      const matchName = p.nome.toLowerCase().includes(lower);
      const matchBarcode = p.codigo_barras?.includes(term);
      const matchCategory = p.categoria?.toLowerCase().includes(lower);
      
      return matchName || matchBarcode || matchCategory;
    }).slice(0, 10); // Limit to 10 results for performance
  }, [produtos]);

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDebouncedResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const results = searchProducts(searchTerm);
      setDebouncedResults(results);
      setIsSearching(false);
      setHighlightedIndex(0);
    }, 150); // 150ms debounce for responsive feel

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, searchProducts]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || debouncedResults.length === 0) {
      if (e.key === "Enter" && searchTerm.trim()) {
        // Try exact barcode match on Enter
        const barcodeMatch = produtos.find(p => p.codigo_barras === searchTerm.trim());
        if (barcodeMatch) {
          handleSelectProduct(barcodeMatch);
          e.preventDefault();
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < debouncedResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : debouncedResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (debouncedResults[highlightedIndex]) {
          handleSelectProduct(debouncedResults[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;
    }
  };

  // Handle product selection
  const handleSelectProduct = (product: Produto) => {
    onProductSelect(product.id);
    setSearchTerm("");
    setIsOpen(false);
    setDebouncedResults([]);
  };

  // Handle clear
  const handleClear = () => {
    setSearchTerm("");
    setIsOpen(false);
    setDebouncedResults([]);
    onClear?.();
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const highlighted = dropdownRef.current.querySelector('[data-highlighted="true"]');
      highlighted?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="relative w-full">
      {/* Display selected product or search input */}
      {selectedProduct && !searchTerm ? (
        <div className="flex items-center gap-2 h-11 px-3 rounded-ios-md border-2 border-transparent bg-secondary">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{selectedProduct.nome}</span>
            <span className="text-xs text-muted-foreground">
              {formatPrice(selectedProduct.preco_venda)} • Est: {selectedProduct.estoque_atual}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && searchTerm.trim() && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden",
            "max-h-[280px] overflow-y-auto"
          )}
        >
          {isSearching ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Buscando...
            </div>
          ) : debouncedResults.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Nenhum produto encontrado
            </div>
          ) : (
            <ul className="py-1">
              {debouncedResults.map((product, index) => (
                <li
                  key={product.id}
                  data-highlighted={index === highlightedIndex}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                    "hover:bg-accent",
                    index === highlightedIndex && "bg-accent"
                  )}
                  onClick={() => handleSelectProduct(product)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{product.nome}</span>
                      {product.categoria && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {product.categoria}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">
                        {formatPrice(product.preco_venda)}
                      </span>
                      <span>•</span>
                      <span className={cn(
                        product.estoque_atual <= 0 && "text-destructive font-medium"
                      )}>
                        Est: {product.estoque_atual}
                      </span>
                      {product.codigo_barras && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{product.codigo_barras}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
