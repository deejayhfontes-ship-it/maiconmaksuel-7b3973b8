import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import logoMaicon from "@/assets/logo.svg";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Digite seu email");
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast.error("Erro ao enviar email. Tente novamente.");
      return;
    }

    setSent(true);
  };

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
          {sent ? (
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <h2 className="text-lg font-semibold">Email enviado!</h2>
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold">Recuperar senha</h2>
                  <p className="text-sm text-muted-foreground">
                    Digite seu email para receber um link de recuperação
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link
                </Button>

                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="inline mr-1 h-3 w-3" />
                  Voltar ao login
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
