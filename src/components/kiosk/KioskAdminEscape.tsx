/**
 * KioskAdminEscape - Long-press logo 5s to reveal admin exit
 * Requires admin PIN to leave kiosk mode
 */
import { useState, useRef, useCallback } from "react";
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
import { isDesktopWrapper } from "@/lib/desktopDetection";
import { supabase } from "@/integrations/supabase/client";

interface KioskAdminEscapeProps {
  children: React.ReactNode;
}

export default function KioskAdminEscape({ children }: KioskAdminEscapeProps) {
  const navigate = useNavigate();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartRef = useRef<number>(0);

  const handlePressStart = useCallback(() => {
    pressStartRef.current = Date.now();
    pressTimerRef.current = setTimeout(() => {
      setShowPinDialog(true);
    }, 5000); // 5 seconds hold
  }, []);

  const handlePressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleVerifyPin = async () => {
    if (pin.length !== 4) return;
    setVerifying(true);
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
        // Deactivate kiosk
        try {
          await window.electron?.setKioskEnabled(false);
        } catch {
          localStorage.setItem("mm-kiosk-device-enabled", "false");
        }
        // Reset the prompt so it can ask again later
        localStorage.removeItem("mm-kiosk-prompt-dismissed");
        
        setShowPinDialog(false);
        setPin("");
        toast.success("Modo Kiosk desativado");
        navigate("/dashboard");
      } else {
        toast.error("PIN de administrador inválido");
        setPin("");
      }
    } catch {
      toast.error("Erro ao verificar PIN");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <div
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        className="cursor-pointer select-none"
      >
        {children}
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Acesso Administrativo
            </DialogTitle>
            <DialogDescription>
              Digite o PIN de administrador para sair do modo Kiosk.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={(val: string) => setPin(val)}
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
            <Button
              variant="outline"
              onClick={() => { setShowPinDialog(false); setPin(""); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerifyPin}
              disabled={pin.length !== 4 || verifying}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Voltar ao Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
