import { useState, useEffect } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, KeyRound, Users, Eye, EyeOff, Trash2 } from "lucide-react";

interface SimpleUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create user
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const callFunction = async (body: Record<string, string>) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-users", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await callFunction({ action: "list-users" });
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword) return;
    setCreating(true);
    try {
      await callFunction({ action: "create-user", email: createEmail, password: createPassword });
      toast({ title: "Sucesso", description: "Usuário criado com sucesso!" });
      setCreateEmail("");
      setCreatePassword("");
      loadUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetPassword) return;
    setResetting(true);
    try {
      await callFunction({ action: "reset-password", email: resetEmail, password: resetPassword });
      toast({ title: "Sucesso", description: "Senha alterada com sucesso!" });
      setResetEmail("");
      setResetPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h2>
        <p className="text-sm text-[hsl(220,10%,50%)] mt-1">Criar contas e redefinir senhas</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create User */}
        <div className="rounded-xl border border-[hsl(220,15%,15%)] bg-[hsl(220,20%,9%)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Criar Usuário</h3>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(220,10%,55%)]">Email</Label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
                placeholder="novo@email.com"
                className="h-11 bg-[hsl(220,20%,12%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(220,10%,55%)]">Senha</Label>
              <div className="relative">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-11 bg-[hsl(220,20%,12%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,70%)]"
                >
                  {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={creating}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Criar Usuário
            </Button>
          </form>
        </div>

        {/* Reset Password */}
        <div className="rounded-xl border border-[hsl(220,15%,15%)] bg-[hsl(220,20%,9%)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold">Redefinir Senha</h3>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(220,10%,55%)]">Email do Usuário</Label>
              <Input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="usuario@email.com"
                className="h-11 bg-[hsl(220,20%,12%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(220,10%,55%)]">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-11 bg-[hsl(220,20%,12%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,70%)]"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={resetting}
              className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Redefinir Senha
            </Button>
          </form>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-[hsl(220,15%,15%)] bg-[hsl(220,20%,9%)] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold">Usuários Cadastrados</h3>
          <span className="ml-auto text-xs text-[hsl(220,10%,45%)]">{users.length} usuários</span>
        </div>
        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,15%)]">
                  <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(220,10%,45%)] uppercase">Email</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(220,10%,45%)] uppercase">Criado em</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(220,10%,45%)] uppercase">Último login</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-[hsl(220,10%,45%)] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[hsl(220,15%,12%)] hover:bg-[hsl(220,15%,11%)]">
                    <td className="py-3 px-3 text-[hsl(220,10%,80%)]">{u.email}</td>
                    <td className="py-3 px-3 text-[hsl(220,10%,50%)]">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-3 text-[hsl(220,10%,50%)]">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")
                        : "Nunca"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={async () => {
                          if (!confirm(`Tem certeza que deseja excluir ${u.email}?`)) return;
                          setDeletingId(u.id);
                          try {
                            await callFunction({ action: "delete-user", email: u.email! });
                            toast({ title: "Sucesso", description: "Usuário excluído!" });
                            loadUsers();
                          } catch (err: any) {
                            toast({ title: "Erro", description: err.message, variant: "destructive" });
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === u.id}
                        className="text-[hsl(220,10%,45%)] hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
