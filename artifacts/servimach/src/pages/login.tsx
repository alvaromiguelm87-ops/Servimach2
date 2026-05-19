import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-6">
            <span className="text-3xl font-bold text-primary">S</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Bem-vindo à Servimach</h1>
          <p className="text-muted-foreground">
            A plataforma premium para conectar clientes e profissionais locais.
          </p>
          
          <div className="pt-8">
            <Button 
              size="lg" 
              className="w-full font-semibold text-base h-12" 
              onClick={() => login()}
              disabled={isLoading}
            >
              {isLoading ? "A carregar..." : "Continuar com Replit"}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-6 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            <span>Autenticação segura e rápida</span>
          </div>
        </div>
      </div>
    </div>
  );
}