import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2, UserPlus, Users, Trash2, UserCheck, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Professional {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
}

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 1,
  professional: 3,
  enterprise: null, // unlimited
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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

    if (!error) setProfessionals(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    if (isAtLimit) {
      toast({
        title: "Limite atingido",
        description: `Seu plano ${PLAN_LABELS[plan] || plan} permite até ${maxUsers} profissional(is).`,
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("professionals").insert({
      user_id: user.id,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    });

    if (error) {
      const msg = error.message.includes("Limite de profissionais")
        ? `Seu plano permite até ${maxUsers} profissional(is). Faça upgrade para adicionar mais.`
        : error.message;
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Profissional adicionado!" });
      setName("");
      setEmail("");
      setPhone("");
      setDialogOpen(false);
      fetchProfessionals();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
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
            Gerencie os profissionais da sua equipe
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Counter badge */}
          <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            {isUnlimited
              ? `${activeCount} profissionais`
              : `${activeCount} de ${maxUsers} profissionais`}
          </Badge>

          {/* Add button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isAtLimit} size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Profissional</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nome do profissional"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={20}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Adicionar Profissional
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
                Faça upgrade para adicionar mais usuários e organizar melhor sua barbearia.
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
              Adicione os profissionais da sua equipe
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((p) => (
            <Card key={p.id} className="group">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{p.name}</p>
                  {p.email && (
                    <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                  )}
                  {p.phone && (
                    <p className="text-sm text-muted-foreground">{p.phone}</p>
                  )}
                  <Badge variant="secondary" className="mt-2 text-xs capitalize">
                    {p.role}
                  </Badge>
                </div>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                  aria-label="Remover profissional"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
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
