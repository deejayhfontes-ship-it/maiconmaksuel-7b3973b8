import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldX, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePinAuth } from "@/contexts/PinAuthContext";

interface AccessDeniedProps {
  message?: string;
}

export default function AccessDenied({ message }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { getDefaultRoute } = usePinAuth();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Acesso Negado</h2>
          <p className="text-sm text-muted-foreground">
            {message || "Você não tem permissão para acessar esta página."}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(getDefaultRoute())}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
