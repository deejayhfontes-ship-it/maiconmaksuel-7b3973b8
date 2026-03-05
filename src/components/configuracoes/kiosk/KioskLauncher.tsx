/**
 * Kiosk Launcher - Quick access panel to open Kiosk from within the system
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isDesktopWrapper } from "@/lib/desktopDetection";
import {
  Tablet,
  ExternalLink,
  Maximize2,
  Copy,
  Check,
  Monitor,
  Link2,
  Info,
} from "lucide-react";

const PUBLIC_KIOSK_URL = "https://maiconmaksuel.lovable.app/kiosk";

export default function KioskLauncher() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);
  const isDesktop = isDesktopWrapper();

  const handleOpenInThisTab = () => {
    navigate("/kiosk");
  };

  const handleOpenNewWindow = () => {
    if (isDesktop) {
      // No desktop, navegar internamente — nunca abrir navegador externo
      navigate("/kiosk");
      toast.success("Kiosk aberto");
    } else {
      window.open(
        window.location.origin + "/kiosk",
        "kiosk",
        "width=1024,height=768,noopener,noreferrer"
      );
      toast.success("Kiosk aberto em nova janela");
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tablet className="h-5 w-5" />
            Abrir Kiosk
          </CardTitle>
          <CardDescription>
            Escolha como abrir o modo Kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Open in this tab */}
          <Button
            className="w-full justify-start gap-3 h-12"
            onClick={handleOpenInThisTab}
          >
            <Monitor className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Abrir Kiosk nesta tela</div>
              <div className="text-xs opacity-70">Substitui a tela atual pelo Kiosk</div>
            </div>
          </Button>

          {/* Open in new window */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleOpenNewWindow}
          >
            <ExternalLink className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Abrir Kiosk em nova janela</div>
              <div className="text-xs text-muted-foreground">
                {isDesktop ? "Abre janela no app desktop" : "Abre em nova aba do navegador"}
              </div>
            </div>
          </Button>

          {/* Open fullscreen */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => {
              navigate("/kiosk");
              setTimeout(() => {
                document.documentElement.requestFullscreen?.();
              }, 500);
            }}
          >
            <Maximize2 className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Abrir Kiosk em tela cheia</div>
              <div className="text-xs text-muted-foreground">Fullscreen imersivo</div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Links & Deep Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Links e Deep Links
          </CardTitle>
          <CardDescription>
            Use estes links para configurar o acesso direto ao Kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Public URL */}
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Link público (Web)</p>
              <p className="text-sm font-mono truncate">{PUBLIC_KIOSK_URL}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(PUBLIC_KIOSK_URL, "public")}
            >
              {copied === "public" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Deep link with mode param */}
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Deep Link (com ?mode=kiosk)</p>
              <p className="text-sm font-mono truncate">{PUBLIC_KIOSK_URL}?mode=kiosk</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(`${PUBLIC_KIOSK_URL}?mode=kiosk`, "deep")}
            >
              {copied === "deep" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Hash link for EXE */}
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Link para EXE (HashRouter)</p>
              <p className="text-sm font-mono truncate">index.html#/kiosk</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy("index.html#/kiosk", "hash")}
            >
              {copied === "hash" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Ambiente Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {isDesktop ? "Desktop (EXE)" : "Web (Navegador)"}
            </Badge>
            <Badge variant="outline">
              Router: {isDesktop ? "HashRouter" : "BrowserRouter"}
            </Badge>
            <Badge variant="outline">
              Protocol: {window.location.protocol}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
