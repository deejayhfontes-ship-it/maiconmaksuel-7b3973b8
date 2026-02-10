/**
 * KioskAdminEscapeKeyboard - Ctrl+Shift+K to open admin PIN modal
 * Allows escaping kiosk mode via keyboard shortcut + admin PIN verification.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function KioskAdminEscapeKeyboard() {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Listen for Ctrl+Shift+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        console.log("[KioskEscape] Ctrl+Shift+K detected — opening PIN dialog");
        setShowDialog(true);
        setPin("");
      }
    };
    window.addEventListener("keydown", handler, true); // capture phase
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setPin("");
  }, []);

  const handleVerifyPin = useCallback(async () => {
    if (pin.length !== 4 || verifying) return;
    setVerifying(true);
    console.log("[KioskEscape] verifying admin PIN...");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("pinos_acesso")
        .select("id, perfil, ativo")
        .eq("codigo", pin)
        .eq("perfil", "admin")
        .eq("ativo", true)
        .maybeSingle();

      if (data) {
        console.log("[KioskEscape] PIN válido — desativando kiosk");

        // Deactivate kiosk on Electron
        try {
          await window.electron?.setKioskEnabled(false);
          await window.electron?.setStartMode?.("admin");
        } catch {
          localStorage.setItem("mm-kiosk-device-enabled", "false");
        }
        localStorage.removeItem("mm-kiosk-prompt-dismissed");

        // Exit fullscreen if active
        if (document.fullscreenElement) {
          try { await document.exitFullscreen(); } catch {}
        }

        setShowDialog(false);
        setPin("");
        toast.success("Modo Kiosk desativado — voltando ao Admin");
        navigate("/dashboard", { replace: true });
      } else {
        console.log("[KioskEscape] PIN inválido");
        toast.error("PIN de administrador inválido");
        setPin("");
      }
    } catch (err) {
      console.error("[KioskEscape] erro ao verificar PIN:", err);
      toast.error("Erro ao verificar PIN");
    } finally {
      setVerifying(false);
    }
  }, [pin, verifying, navigate]);

  return (
    <Dialog open={showDialog} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm" onEscapeKeyDown={(e) => {
        // Allow ESC to close dialog (not blocked)
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Sair do Modo Kiosk
          </DialogTitle>
          <DialogDescription>
            Digite o PIN de administrador para voltar ao painel.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Atalho: Ctrl + Shift + K
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={(val: string) => setPin(val)}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleVerifyPin}
            disabled={pin.length !== 4 || verifying}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {verifying ? "Verificando..." : "Voltar ao Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
