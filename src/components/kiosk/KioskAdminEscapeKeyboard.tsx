/**
 * KioskAdminEscapeKeyboard - Escape hatch for kiosk mode
 * 
 * Triggers:
 *   - Renderer: Ctrl+Shift+K keydown (capture phase)
 *   - Electron main: globalShortcut → IPC 'trigger-kiosk-escape'
 * 
 * Validates admin PIN against Supabase `pinos_acesso`.
 * Rate-limited: 5 attempts, then 30s cooldown.
 */
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Shield, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;

export default function KioskAdminEscapeKeyboard() {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isCoolingDown = cooldownUntil !== null && Date.now() < cooldownUntil;

  // Cooldown countdown
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) {
        setCooldownUntil(null);
        setAttempts(0);
        setCooldownLeft(0);
      }
    };
    tick();
    cooldownTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldownUntil]);

  const openEscapeDialog = useCallback(() => {
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.log("[KioskEscape] blocked: cooldown active");
      return;
    }
    console.log("[KioskEscape] escape_hotkey_pressed — opening PIN dialog");
    setShowDialog(true);
    setPin("");
  }, [cooldownUntil]);

  // Renderer-side keyboard listener (Ctrl+Shift+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        openEscapeDialog();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [openEscapeDialog]);

  // Electron IPC listener (main process globalShortcut)
  useEffect(() => {
    const electron = window.electron;
    if (!electron) return;
    if (typeof (electron as any).onTriggerKioskEscape !== 'function') return;

    (electron as any).onTriggerKioskEscape(() => {
      console.log("[KioskEscape] IPC trigger-kiosk-escape received from main");
      openEscapeDialog();
    });

    return () => {
      (electron as any).removeTriggerKioskEscapeListener?.();
    };
  }, [openEscapeDialog]);

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setPin("");
  }, []);

  const handleVerifyPin = useCallback(async () => {
    if (pin.length !== 4 || verifying) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

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
        console.log("[KioskEscape] auth_ok — desativando kiosk");

        // Deactivate kiosk on Electron
        try {
          await window.electron?.setKioskEnabled(false);
          await (window.electron as any)?.setStartMode?.("admin");
          // Tell main process to exit kiosk/fullscreen on the BrowserWindow
          await (window.electron as any)?.exitKioskMode?.();
        } catch {
          localStorage.setItem("mm-kiosk-device-enabled", "false");
        }
        localStorage.removeItem("mm-kiosk-prompt-dismissed");

        // Exit browser fullscreen if active
        if (document.fullscreenElement) {
          try { await document.exitFullscreen(); } catch {}
        }

        setShowDialog(false);
        setPin("");
        setAttempts(0);
        console.log("[KioskEscape] exit_kiosk_done");
        toast.success("Modo Kiosk desativado — voltando ao Admin");
        navigate("/dashboard", { replace: true });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        console.log(`[KioskEscape] auth_fail (${newAttempts}/${MAX_ATTEMPTS})`);

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + COOLDOWN_MS;
          setCooldownUntil(until);
          console.log("[KioskEscape] max attempts reached — cooldown 30s");
          toast.error("Muitas tentativas. Aguarde 30 segundos.");
        } else {
          toast.error(`PIN inválido (${newAttempts}/${MAX_ATTEMPTS})`);
        }
        setPin("");
      }
    } catch (err) {
      console.error("[KioskEscape] auth_fail (error):", err);
      toast.error("Erro ao verificar PIN");
    } finally {
      setVerifying(false);
    }
  }, [pin, verifying, navigate, attempts, cooldownUntil]);

  return (
    <Dialog open={showDialog} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
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

        {isCoolingDown ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">
              Muitas tentativas incorretas.<br />
              Tente novamente em <strong>{cooldownLeft}s</strong>
            </p>
          </div>
        ) : (
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
        )}

        {attempts > 0 && !isCoolingDown && (
          <p className="text-xs text-center text-muted-foreground">
            Tentativa {attempts}/{MAX_ATTEMPTS}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleVerifyPin}
            disabled={pin.length !== 4 || verifying || isCoolingDown}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {verifying ? "Verificando..." : "Voltar ao Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
