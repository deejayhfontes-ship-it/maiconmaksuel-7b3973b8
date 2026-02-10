/**
 * KioskActivationModal - Shown on first admin dashboard access on desktop
 * Asks whether to activate kiosk mode on this device
 */
import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tablet } from "lucide-react";
import { isDesktopWrapper } from "@/lib/desktopDetection";
import { setKioskDeviceEnabled } from "@/lib/startMode";

const KIOSK_PROMPT_DISMISSED_KEY = "mm-kiosk-prompt-dismissed";

export default function KioskActivationModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    // Only show on desktop, and only if not previously dismissed
    if (!isDesktopWrapper()) return;
    const dismissed = localStorage.getItem(KIOSK_PROMPT_DISMISSED_KEY);
    if (dismissed === "true") return;

    // Small delay so dashboard loads first
    const timer = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleActivate = async () => {
    if (rememberChoice) {
      localStorage.setItem(KIOSK_PROMPT_DISMISSED_KEY, "true");
    }
    // Persist via Electron IPC + localStorage mirror
    setKioskDeviceEnabled(true);
    try {
      await window.electron?.setKioskEnabled(true);
    } catch {
      // localStorage already set above
    }
    setOpen(false);
    navigate("/kiosk");
  };

  const handleDismiss = () => {
    if (rememberChoice) {
      localStorage.setItem(KIOSK_PROMPT_DISMISSED_KEY, "true");
    }
    setOpen(false);
  };

  if (!isDesktopWrapper()) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tablet className="h-5 w-5 text-primary" />
            Ativar modo Kiosk neste dispositivo?
          </DialogTitle>
          <DialogDescription>
            O modo Kiosk transforma este computador em um terminal de atendimento
            para clientes e funcionários. Ao ativar, o app iniciará automaticamente
            no Kiosk nos próximos acessos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="remember"
            checked={rememberChoice}
            onCheckedChange={(v) => setRememberChoice(!!v)}
          />
          <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
            Lembrar minha escolha
          </Label>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            Agora não
          </Button>
          <Button onClick={handleActivate}>
            Ativar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
