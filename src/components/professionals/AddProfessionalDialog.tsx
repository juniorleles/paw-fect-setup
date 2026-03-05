import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, UserPlus } from "lucide-react";

interface AddProfessionalDialogProps {
  userId: string;
  disabled: boolean;
  onCreated: () => void;
}

const AddProfessionalDialog = ({ userId, disabled, onCreated }: AddProfessionalDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    const { error } = await supabase.from("professionals").insert({
      user_id: userId,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    });

    if (error) {
      const msg = error.message.includes("Limite de profissionais")
        ? "Seu plano atingiu o limite de profissionais. Faça upgrade para adicionar mais."
        : error.message;
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Profissional adicionado!" });
      setName("");
      setEmail("");
      setPhone("");
      setOpen(false);
      onCreated();
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} size="sm">
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
            <p className="text-xs text-muted-foreground">
              Necessário para conceder acesso ao sistema
            </p>
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
  );
};

export default AddProfessionalDialog;
