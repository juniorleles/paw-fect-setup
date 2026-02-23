import { useMemo, useState, useCallback } from "react";
import { Bell, BellOff, Clock, CheckCircle2, XCircle, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { Appointment } from "@/types/appointment";
import { STATUS_CONFIG } from "./AppointmentCard";

interface Props {
  appointments: Appointment[];
  onStatusChange: (id: string, status: Appointment["status"]) => void;
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
}

const COLUMNS: { status: Appointment["status"]; label: string; icon: typeof Clock }[] = [
  { status: "pending", label: "Pendentes", icon: Clock },
  { status: "confirmed", label: "Confirmados", icon: CheckCircle2 },
  { status: "completed", label: "Concluídos", icon: CheckCircle2 },
  { status: "cancelled", label: "Cancelados", icon: XCircle },
];

const AppointmentKanbanView = ({ appointments, onStatusChange, onEdit, onDelete }: Props) => {
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const columnData = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      items: appointments.filter((a) => a.status === col.status).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    }));
  }, [appointments]);

  const handleDragStart = useCallback((e: React.DragEvent, apt: Appointment) => {
    e.dataTransfer.setData("text/plain", apt.id);
    e.dataTransfer.setData("application/x-status", apt.status);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(apt.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStatus(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: Appointment["status"]) => {
    e.preventDefault();
    const aptId = e.dataTransfer.getData("text/plain");
    const sourceStatus = e.dataTransfer.getData("application/x-status");
    setDragOverStatus(null);
    setDraggingId(null);
    if (aptId && sourceStatus !== targetStatus) {
      onStatusChange(aptId, targetStatus);
    }
  }, [onStatusChange]);

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStatus(null);
    }
  }, []);

  const getColumnHighlightClass = (status: string) => {
    if (dragOverStatus !== status) return "";
    switch (status) {
      case "pending": return "ring-2 ring-accent/50 bg-accent/10 scale-[1.01]";
      case "confirmed": return "ring-2 ring-success/50 bg-success/10 scale-[1.01]";
      case "completed": return "ring-2 ring-primary/50 bg-primary/10 scale-[1.01]";
      case "cancelled": return "ring-2 ring-destructive/50 bg-destructive/10 scale-[1.01]";
      default: return "ring-2 ring-primary/50 bg-primary/10";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {columnData.map((col) => {
        const ColIcon = col.icon;
        const isHighlighted = dragOverStatus === col.status;
        return (
          <div
            key={col.status}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`bg-muted/30 rounded-xl border border-border/50 min-h-[300px] flex flex-col transition-all duration-200 ${getColumnHighlightClass(col.status)}`}
          >
            {/* Column header */}
            <div className={`flex items-center gap-2 p-3 border-b transition-colors duration-200 ${isHighlighted ? "border-transparent" : "border-border/50"}`}>
              <ColIcon className={`w-4 h-4 ${col.status === "pending" ? "text-accent" : col.status === "confirmed" ? "text-success" : col.status === "completed" ? "text-primary" : "text-destructive"}`} />
              <span className="text-sm font-bold">{col.label}</span>
              <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                {col.items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[500px]">
              {col.items.map((apt) => {
                const now = new Date();
                const aptDateTime = new Date(`${apt.date}T${apt.time}`);
                const isOverdue = aptDateTime < now && apt.status !== "cancelled" && apt.status !== "completed";
                const isDragging = draggingId === apt.id;

                return (
                  <div
                    key={apt.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, apt)}
                    onDragEnd={handleDragEnd}
                    className={`bg-card rounded-lg p-3 shadow-sm border border-border/30 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 ${
                      isOverdue ? "border-l-2 border-l-destructive" : ""
                    } ${isDragging ? "opacity-40 scale-95 rotate-1" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate">{apt.owner_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.pet_name} · {apt.service}</p>
                      </div>
                      {apt.confirmation_message_sent_at ? (
                        <Bell className="w-3 h-3 text-success flex-shrink-0 mt-1" />
                      ) : (
                        <BellOff className="w-3 h-3 text-muted-foreground/30 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{apt.time.slice(0, 5)}</span>
                        <span>·</span>
                        <span>{apt.date.slice(5).replace("-", "/")}</span>
                        {isOverdue && <AlertTriangle className="w-3 h-3 text-destructive ml-1" />}
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(apt)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
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
                  </div>
                );
              })}
              {col.items.length === 0 && (
                <p className={`text-xs text-center py-8 transition-colors duration-200 ${isHighlighted ? "text-foreground/60 font-medium" : "text-muted-foreground opacity-50"}`}>
                  {isHighlighted ? "Solte aqui ↓" : "Arraste cards aqui"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AppointmentKanbanView;
