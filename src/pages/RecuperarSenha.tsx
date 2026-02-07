import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import logoMaicon from "@/assets/logo.svg";

export default function RecuperarSenha() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={logoMaicon} 
            alt="Maicon Concept" 
            className="h-16 object-contain dark:brightness-0 dark:invert"
          />
        </div>

        {/* Card */}
        <Card className="border-border/50">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <Info className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Recuperar acesso</h2>
            <p className="text-sm text-muted-foreground">
              O acesso ao sistema é feito através de PIN de 4 dígitos. Caso tenha esquecido seu PIN, entre em contato com o administrador.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
