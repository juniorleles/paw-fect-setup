import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Bell,
  BellOff,
  RotateCcw,
  AlertTriangle,
  User,
  Phone,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Appointment } from "@/types/appointment";
import { format } from "date-fns";

export const STATUS_CONFIG: Record<
  string,
  { label: string; class: string; bgClass: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pendente",
    class: "bg-accent/15 text-accent border-accent/30",
    bgClass: "border-l-accent",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmado",
    class: "bg-success/15 text-success border-success/30",
    bgClass: "border-l-success",
    icon: CheckCircle2,
  },
  completed: {
    label: "Concluído",
    class: "bg-primary/15 text-primary border-primary/30",
    bgClass: "border-l-primary",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    class: "bg-destructive/15 text-destructive border-destructive/30",
    bgClass: "border-l-destructive",
    icon: XCircle,
  },
};

interface Props {
  appointment: Appointment;
  onStatusChange: (id: string, status: Appointment["status"]) => void;
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
}

const AppointmentCard = ({ appointment: apt, onStatusChange, onEdit, onDelete }: Props) => {
  const statusInfo = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
  const now = new Date();
  const aptDateTime = new Date(`${apt.date}T${apt.time}`);
  const isOverdue = aptDateTime < now && apt.status !== "cancelled" && apt.status !== "completed";
  const isUrgent =
    !isOverdue &&
    aptDateTime.getTime() - now.getTime() < 3600000 &&
    aptDateTime > now &&
    apt.status !== "cancelled" &&
    apt.status !== "completed";

  return (
    <div
      className={`relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all group ${
        isOverdue ? "border-l-4 border-l-destructive bg-destructive/5" : isUrgent ? "border-l-4 border-l-accent bg-accent/5" : `border-l-4 ${statusInfo.bgClass}`
      }`}
    >
      {/* Time */}
      <div className="flex items-center gap-3 sm:min-w-[80px]">
        <div className={`text-center ${isOverdue ? "text-destructive" : ""}`}>
          <p className="text-xl font-bold leading-none">{apt.time.slice(0, 5)}</p>
          {isOverdue && (
            <span className="text-[10px] font-semibold text-destructive flex items-center gap-0.5 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> Atrasado
            </span>
          )}
          {isUrgent && (
            <span className="text-[10px] font-semibold text-accent flex items-center gap-0.5 mt-0.5">
              <Clock className="w-3 h-3" /> Em breve
            </span>
          )}
        </div>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-foreground truncate">{apt.owner_name}</p>
          {apt.confirmation_message_sent_at ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Bell className="w-3.5 h-3.5 text-success flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  Lembrete enviado em {format(new Date(apt.confirmation_message_sent_at), "dd/MM HH:mm")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <BellOff className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Lembrete não enviado</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
          <span className="truncate">{apt.pet_name}</span>
          <span className="text-border">·</span>
          <span className="truncate">{apt.service}</span>
        </div>
        {apt.notes && (
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">{apt.notes}</p>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${statusInfo.class}`}>
        {statusInfo.label}
      </span>

      {/* Quick actions */}
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {apt.status === "pending" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success hover:bg-success/10" onClick={() => onStatusChange(apt.id, "confirmed")}>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Confirmar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {apt.status === "confirmed" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => onStatusChange(apt.id, "completed")}>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Concluir</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {(apt.status === "cancelled" || apt.status === "completed") && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent hover:bg-accent/10" onClick={() => onStatusChange(apt.id, "pending")}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reabrir</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(apt)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AlertDialog>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Remover</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover agendamento?</AlertDialogTitle>
              <AlertDialogDescription>
                O agendamento de {apt.pet_name} será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(apt.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AppointmentCard;
