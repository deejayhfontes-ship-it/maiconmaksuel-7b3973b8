import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NotFoundResourceProps {
  resourceName?: string;
  backPath?: string;
  backLabel?: string;
}

export default function NotFoundResource({ 
  resourceName = "Recurso",
  backPath,
  backLabel = "Voltar"
}: NotFoundResourceProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-muted">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">{resourceName} não encontrado</h2>
          <p className="text-sm text-muted-foreground">
            O registro solicitado não existe ou foi removido.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
