import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Users, UserCheck, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfessionalCard from "@/components/professionals/ProfessionalCard";
import AddProfessionalDialog from "@/components/professionals/AddProfessionalDialog";

interface Professional {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  auth_user_id: string | null;
  created_at: string;
}

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 1,
  professional: 3,
  enterprise: null,
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Free",
  professional: "Essencial",
  enterprise: "Pro",
};

const Professionals = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [deleting, setDeleting] = useState(false);

  const maxUsers = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
  const isUnlimited = maxUsers === null;
  const activeCount = professionals.filter((p) => p.status === "active").length;
  const isAtLimit = !isUnlimited && activeCount >= (maxUsers as number);

  const fetchProfessionals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (!error) setProfessionals((data as Professional[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // If professional has access, revoke it first
    if (deleteTarget.auth_user_id) {
      try {
        await supabase.functions.invoke("manage-professional-access", {
          body: { action: "revoke-access", professional_id: deleteTarget.id },
        });
      } catch (err) {
        console.warn("Failed to revoke access during delete:", err);
      }
    }

    const { error } = await supabase
      .from("professionals")
      .update({ status: "inactive" })
      .eq("id", deleteTarget.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Profissional removido." });
      fetchProfessionals();
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os profissionais e o acesso da sua equipe
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            {isUnlimited
              ? `${activeCount} profissionais`
              : `${activeCount} de ${maxUsers} profissionais`}
          </Badge>

          {user && (
            <AddProfessionalDialog
              userId={user.id}
              disabled={isAtLimit}
              onCreated={fetchProfessionals}
            />
          )}
        </div>
      </div>

      {/* Upgrade CTA when at limit */}
      {isAtLimit && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
            <Crown className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                Seu plano atual permite até {maxUsers} profissional{(maxUsers as number) > 1 ? "is" : ""}.
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Faça upgrade para adicionar mais membros à sua equipe.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/my-account")}>
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Professionals List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : professionals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum profissional cadastrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Adicione os profissionais da sua equipe e conceda acesso ao sistema
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((p) => (
            <ProfessionalCard
              key={p.id}
              professional={p}
              onDelete={setDeleteTarget}
              onRefresh={fetchProfessionals}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong> da sua equipe?
              {deleteTarget?.auth_user_id && (
                <span className="block mt-1 text-destructive">
                  O acesso ao sistema também será revogado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Professionals;
