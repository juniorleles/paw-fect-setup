import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldCheck } from "lucide-react";

const ProfessionalLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const magicLink = useMemo(() => searchParams.get("ml") ?? "", [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleContinue = () => {
    if (!magicLink) return;
    window.location.assign(magicLink);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Acesso do profissional</CardTitle>
          <CardDescription>
            Toque no botão abaixo para concluir seu login com segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleContinue} disabled={!magicLink}>
            Entrar agora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalLogin;
