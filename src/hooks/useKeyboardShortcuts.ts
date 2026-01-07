import { useEffect, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ShortcutHandlers {
  onNewItem?: () => void;
  onSave?: () => void;
  onOpenSearch?: () => void;
}

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        toast({
          title: "Modo Kiosk ativado",
          description: "Pressione F11 ou Escape para sair",
        });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        toast({
          title: "Modo Kiosk desativado",
        });
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, [toast]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();

      // Evitar conflitos quando estiver digitando em inputs
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      // F11 - Fullscreen (sempre funciona)
      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      // Shift+? - Modal de ajuda
      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // Escape - Fechar modal/sair fullscreen
      if (event.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
        setIsHelpOpen(false);
        return;
      }

      // Não processar outros atalhos se estiver digitando
      if (isTyping && !modKey) return;

      // Cmd/Ctrl+K - Abrir busca global
      if (modKey && key === "k") {
        event.preventDefault();
        handlers?.onOpenSearch?.();
        toast({
          title: "⌘K",
          description: "Busca global",
        });
        return;
      }

      // Cmd/Ctrl+N - Novo item (baseado na rota)
      if (modKey && key === "n") {
        event.preventDefault();
        if (handlers?.onNewItem) {
          handlers.onNewItem();
        } else {
          // Detectar rota e mostrar toast
          const routeActions: Record<string, string> = {
            "/clientes": "Novo Cliente",
            "/servicos": "Novo Serviço",
            "/produtos": "Novo Produto",
            "/profissionais": "Novo Profissional",
            "/agenda": "Novo Agendamento",
            "/atendimentos": "Nova Comanda",
          };
          const action = routeActions[location.pathname];
          if (action) {
            toast({
              title: "⌘N",
              description: action,
            });
          }
        }
        return;
      }

      // Cmd/Ctrl+S - Salvar
      if (modKey && key === "s") {
        event.preventDefault();
        if (handlers?.onSave) {
          handlers.onSave();
          toast({
            title: "⌘S",
            description: "Salvando...",
          });
        }
        return;
      }

      // Cmd/Ctrl+B - Ir para Caixa
      if (modKey && key === "b") {
        event.preventDefault();
        navigate("/caixa");
        toast({
          title: "⌘B",
          description: "Abrindo Caixa",
        });
        return;
      }

      // Cmd/Ctrl+A - Ir para Atendimentos (só se não estiver digitando)
      if (modKey && key === "a" && !isTyping) {
        event.preventDefault();
        navigate("/atendimentos");
        toast({
          title: "⌘A",
          description: "Abrindo Atendimentos",
        });
        return;
      }
    },
    [handlers, location.pathname, navigate, toast, toggleFullscreen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    // Listener para mudança de fullscreen
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleKeyDown]);

  return {
    isHelpOpen,
    setIsHelpOpen,
    isFullscreen,
    toggleFullscreen,
  };
}

// Lista de atalhos para exibição
export const KEYBOARD_SHORTCUTS = [
  {
    category: "Navegação",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Busca global" },
      { keys: ["⌘", "B"], description: "Ir para Caixa" },
      { keys: ["⌘", "A"], description: "Ir para Atendimentos" },
    ],
  },
  {
    category: "Ações",
    shortcuts: [
      { keys: ["⌘", "N"], description: "Novo item (contexto da página)" },
      { keys: ["⌘", "S"], description: "Salvar formulário" },
    ],
  },
  {
    category: "Sistema",
    shortcuts: [
      { keys: ["F11"], description: "Modo Kiosk (tela cheia)" },
      { keys: ["Shift", "?"], description: "Mostrar atalhos" },
      { keys: ["Esc"], description: "Fechar modal / Sair do Kiosk" },
    ],
  },
];
