import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Trash2, KeyRound, Send, ShieldOff, MoreVertical } from "lucide-react";

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

interface ProfessionalCardProps {
  professional: Professional;
  onDelete: (p: Professional) => void;
  onRefresh: () => void;
}

const ProfessionalCard = ({ professional: p, onDelete, onRefresh }: ProfessionalCardProps) => {
  const { toast } = useToast();
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [resending, setResending] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const hasAccess = !!p.auth_user_id;

  const handleGrantAccess = async () => {
    if (!p.email) {
      toast({
        title: "Email obrigatório",
        description: "Cadastre um email para este profissional antes de conceder acesso.",
        variant: "destructive",
      });
      return;
    }

    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-professional-access", {
        body: { action: "grant-access", professional_id: p.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Acesso concedido!", description: data.message });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async () => {
    setRevoking(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-professional-access", {
        body: { action: "revoke-access", professional_id: p.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Acesso revogado", description: data.message });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRevoking(false);
      setRevokeDialogOpen(false);
    }
  };

  const handleResendLink = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-professional-access", {
        body: { action: "resend-link", professional_id: p.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Link reenviado!", description: data.message });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const isLoading = granting || revoking || resending;

  return (
    <>
      <Card className="group">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{p.name}</p>
              {p.email && (
                <p className="text-sm text-muted-foreground truncate">{p.email}</p>
              )}
              {p.phone && (
                <p className="text-sm text-muted-foreground">{p.phone}</p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1 p-1 rounded-md hover:bg-muted"
                  aria-label="Opções"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!hasAccess && (
                  <DropdownMenuItem onClick={handleGrantAccess} disabled={isLoading}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Conceder acesso
                  </DropdownMenuItem>
                )}
                {hasAccess && (
                  <>
                    <DropdownMenuItem onClick={handleResendLink} disabled={isLoading}>
                      <Send className="w-4 h-4 mr-2" />
                      Reenviar link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setRevokeDialogOpen(true)}
                      disabled={isLoading}
                      className="text-destructive focus:text-destructive"
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      Revogar acesso
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(p)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover profissional
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs capitalize">
              {p.role}
            </Badge>
            {hasAccess ? (
              <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                <KeyRound className="w-3 h-3 mr-1" />
                Com acesso
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Sem acesso
              </Badge>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              {granting && "Concedendo acesso..."}
              {revoking && "Revogando acesso..."}
              {resending && "Reenviando link..."}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{p.name}</strong> perderá o acesso ao sistema e não poderá mais fazer login.
              Você pode conceder acesso novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} disabled={revoking}>
              {revoking && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfessionalCard;
