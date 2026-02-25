import { useState, forwardRef } from "react";
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
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Appointment } from "@/types/appointment";
import type { Service } from "@/types/onboarding";

interface Props {
  services: Service[];
  onSave: (apt: Omit<Appointment, "id" | "created_at" | "updated_at" | "confirmation_message_sent_at">) => Promise<{ error: any }>;
  editingAppointment?: Appointment | null;
  onUpdate?: (id: string, updates: Partial<Appointment>) => Promise<{ error: any }>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isPetNiche?: boolean;
  appointments?: Appointment[];
  maxConcurrent?: number;
}

const AppointmentDialog = forwardRef<HTMLDivElement, Props>(({
  services,
  onSave,
  editingAppointment,
  onUpdate,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  isPetNiche = true,
  appointments = [],
  maxConcurrent = 1,
}, ref) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [petName, setPetName] = useState(editingAppointment?.pet_name ?? (isPetNiche ? "" : "—"));
  const [ownerName, setOwnerName] = useState(editingAppointment?.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(editingAppointment?.owner_phone ?? "");
  const [service, setService] = useState(editingAppointment?.service ?? "");
  const [date, setDate] = useState(editingAppointment?.date ?? "");
  const [time, setTime] = useState(editingAppointment?.time ?? "");
  const [status, setStatus] = useState<Appointment["status"]>(editingAppointment?.status ?? "pending");
  const [notes, setNotes] = useState(editingAppointment?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingAppointment;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Check if the selected date+time slot is full
  const isSlotFull = (() => {
    if (!date || !time || maxConcurrent <= 0) return false;
    const timeNormalized = time.slice(0, 5);
    const bookingsAtSlot = appointments.filter(
      (a) =>
        a.date === date &&
        a.time.slice(0, 5) === timeNormalized &&
        a.status !== "cancelled" &&
        (!isEditing || a.id !== editingAppointment?.id)
    ).length;
    return bookingsAtSlot >= maxConcurrent;
  })();

  const resetForm = () => {
    setPetName(isPetNiche ? "" : "—");
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
          {isPetNiche ? (
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
                <Label className="font-semibold text-sm">Tutor *</Label>
                <Input
                  placeholder="Nome do tutor"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Nome do Cliente *</Label>
              <Input
                placeholder="Nome do cliente"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Telefone</Label>
            <Input
              placeholder="(11) 99999-9999"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(formatPhone(e.target.value))}
              inputMode="numeric"
              maxLength={16}
            />
            {ownerPhone && ownerPhone.replace(/\D/g, "").length < 11 && (
              <p className="text-xs text-destructive">Informe um número válido com DDD (11 dígitos)</p>
            )}
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
                    {s.name} — R$ {Number(s.price).toFixed(2)}
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

          {isSlotFull && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Horário lotado! Todos os {maxConcurrent} atendentes já estão ocupados neste horário.</span>
            </div>
          )}

          <Button type="submit" className="w-full font-bold" disabled={saving || isSlotFull || (isPetNiche && !petName) || !ownerName || !service || !date || !time || (!!ownerPhone && ownerPhone.replace(/\D/g, "").length < 11)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEditing ? "Salvar alterações" : "Agendar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
});

AppointmentDialog.displayName = "AppointmentDialog";

export default AppointmentDialog;
