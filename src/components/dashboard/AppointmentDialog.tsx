import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Appointment } from "@/types/appointment";
import type { Service } from "@/types/onboarding";

interface Props {
  services: Service[];
  onSave: (apt: Omit<Appointment, "id" | "created_at" | "updated_at">) => Promise<{ error: any }>;
  editingAppointment?: Appointment | null;
  onUpdate?: (id: string, updates: Partial<Appointment>) => Promise<{ error: any }>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AppointmentDialog = ({
  services,
  onSave,
  editingAppointment,
  onUpdate,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [petName, setPetName] = useState(editingAppointment?.pet_name ?? "");
  const [ownerName, setOwnerName] = useState(editingAppointment?.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(editingAppointment?.owner_phone ?? "");
  const [service, setService] = useState(editingAppointment?.service ?? "");
  const [date, setDate] = useState(editingAppointment?.date ?? "");
  const [time, setTime] = useState(editingAppointment?.time ?? "");
  const [status, setStatus] = useState<Appointment["status"]>(editingAppointment?.status ?? "pending");
  const [notes, setNotes] = useState(editingAppointment?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingAppointment;

  const resetForm = () => {
    setPetName("");
    setOwnerName("");
    setOwnerPhone("");
    setService("");
    setDate("");
    setTime("");
    setStatus("pending");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    if (isEditing && onUpdate) {
      const { error } = await onUpdate(editingAppointment.id, {
        pet_name: petName,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        service,
        date,
        time,
        status,
        notes,
      });
      if (!error) {
        setOpen(false);
      }
    } else {
      const { error } = await onSave({
        user_id: user.id,
        pet_name: petName,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        service,
        date,
        time,
        status,
        notes,
      });
      if (!error) {
        resetForm();
        setOpen(false);
      }
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="font-bold">
            <Plus className="w-4 h-4 mr-2" /> Novo Agendamento
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Nome do Pet *</Label>
              <Input
                placeholder="Ex: Rex"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Dono *</Label>
              <Input
                placeholder="Nome do dono"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Telefone</Label>
            <Input
              placeholder="(11) 99999-9999"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Serviço *</Label>
            <Select value={service} onValueChange={setService} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name} — R$ {s.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Data *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Horário *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Appointment["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Observações</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full font-bold" disabled={saving || !petName || !ownerName || !service || !date || !time}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEditing ? "Salvar alterações" : "Agendar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
