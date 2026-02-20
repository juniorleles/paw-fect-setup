import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PawPrint, RefreshCw, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SubscriptionCancelled = () => {
  const { reactivate, reactivating } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReactivate = async () => {
    const { error } = await reactivate();
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Assinatura reativada!", description: "Bem-vindo(a) de volta!" });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-none shadow-xl">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <PawPrint className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Assinatura cancelada
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Seu número foi desconectado da automação e as funcionalidades premium foram desativadas. Seus dados foram preservados.
            </p>
          </div>
          <Button onClick={handleReactivate} disabled={reactivating} className="w-full font-bold">
            {reactivating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Reativar assinatura
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCancelled;
