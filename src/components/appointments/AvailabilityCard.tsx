import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle } from "lucide-react";
import type { Appointment } from "@/types/appointment";
import type { DaySchedule } from "@/types/onboarding";

interface Props {
  appointments: Appointment[];
  businessHours: DaySchedule[];
  maxConcurrent?: number;
  services?: { name: string; duration?: number }[];
}

const DAY_MAP: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function generateSlots(openTime: string, closeTime: string, intervalMin = 30): string[] {
  const slots: string[] = [];
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  let current = oh * 60 + om;
  const end = ch * 60 + cm;
  while (current < end) {
    const h = String(Math.floor(current / 60)).padStart(2, "0");
    const m = String(current % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += intervalMin;
  }
  return slots;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function getServiceDuration(services: { name: string; duration?: number }[], serviceName: string): number {
  const normalized = (serviceName || "").trim().toLowerCase();
  const svc = services.find((s) => (s.name || "").trim().toLowerCase() === normalized);
  if (svc) return svc.duration || 30;

  // Combined services (e.g. "Pintura cabelo + Escova")
  if (normalized.includes("+")) {
    const parts = normalized.split("+").map((p) => p.trim());
    let total = 0;
    for (const part of parts) {
      const match = services.find((s) => (s.name || "").trim().toLowerCase() === part);
      total += match?.duration || 30;
    }
    return total;
  }
  return 30;
}

const AvailabilityCard = ({ appointments, businessHours, maxConcurrent = 1, services = [] }: Props) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const todayDayName = DAY_MAP[now.getDay()];

  const availability = useMemo(() => {
    const todaySchedule = businessHours.find((d) => d.day === todayDayName);
    if (!todaySchedule || !todaySchedule.isOpen) {
      return { closed: true, totalSlots: 0, freeSlots: 0, occupancy: 100, lastFree: null };
    }

    const allSlots = generateSlots(todaySchedule.openTime, todaySchedule.closeTime);
    const todayApts = appointments.filter((a) => a.date === todayStr && a.status !== "cancelled");

    // Build occupancy map considering service durations
    const bookingsPerSlot = new Map<string, number>();
    todayApts.forEach((a) => {
      const aptStart = timeToMinutes(a.time);
      const aptDuration = getServiceDuration(services, a.service);
      const slotsOccupied = Math.max(1, Math.ceil(aptDuration / 30));
      for (let i = 0; i < slotsOccupied; i++) {
        const slotMin = aptStart + i * 30;
        const slotTime = `${String(Math.floor(slotMin / 60)).padStart(2, "0")}:${String(slotMin % 60).padStart(2, "0")}`;
        bookingsPerSlot.set(slotTime, (bookingsPerSlot.get(slotTime) || 0) + 1);
      }
    });

    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const futureSlots = allSlots.filter((s) => s >= nowTime);

    // Check if business day has ended (no future slots available)
    const dayEnded = futureSlots.length === 0;

    // A slot is free if bookings < maxConcurrent
    const totalCapacity = allSlots.length * maxConcurrent;
    const freeSlots = futureSlots.reduce((acc, s) => {
      const booked = bookingsPerSlot.get(s) || 0;
      return acc + Math.max(0, maxConcurrent - booked);
    }, 0);

    // Calculate occupancy based on actual slot usage (considering durations)
    const totalBooked = Array.from(bookingsPerSlot.values()).reduce((sum, count) => sum + count, 0);
    const occupancy = totalCapacity > 0
      ? Math.round((totalBooked / totalCapacity) * 100)
      : 100;

    const lastFree = [...futureSlots].reverse().find((s) => (bookingsPerSlot.get(s) || 0) < maxConcurrent) || null;

    return { closed: false, dayEnded, totalSlots: totalCapacity, freeSlots, occupancy: Math.min(occupancy, 100), lastFree };
  }, [appointments, businessHours, todayStr, todayDayName]);

  if (availability.closed) {
    return (
      <Card className="border-none shadow-md bg-muted/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Fechado hoje</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFull = !availability.dayEnded && availability.freeSlots === 0;
  const dayEnded = availability.dayEnded;

  if (dayEnded) {
    return (
      <Card className="border-none shadow-md bg-muted/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Disponibilidade Hoje</p>
              <p className="text-sm font-medium text-muted-foreground">Expediente encerrado</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-bold text-muted-foreground">{availability.occupancy}%</span>
              <p className="text-[10px] text-muted-foreground">ocupação</p>
            </div>
          </div>
          <Progress value={availability.occupancy} className="h-2 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-none shadow-md ${isFull ? "bg-destructive/5 border border-destructive/20" : "bg-card"}`}>
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isFull ? "bg-destructive/10" : "bg-primary/10"}`}>
            {isFull ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Clock className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Disponibilidade Hoje</p>
            {isFull ? (
              <p className="text-sm font-bold text-destructive">Agenda cheia hoje</p>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold">{availability.freeSlots}</span>
                <span className="text-xs text-muted-foreground">horários livres</span>
                {availability.lastFree && (
                  <>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="text-xs text-muted-foreground">
                      Último: <span className="font-semibold text-foreground">{availability.lastFree}</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`text-lg font-bold ${isFull ? "text-destructive" : availability.occupancy > 75 ? "text-accent" : "text-primary"}`}>
              {availability.occupancy}%
            </span>
            <p className="text-[10px] text-muted-foreground">ocupação</p>
          </div>
        </div>
        <Progress
          value={availability.occupancy}
          className={`h-2 ${isFull ? "[&>div]:bg-destructive" : availability.occupancy > 75 ? "[&>div]:bg-accent" : ""}`}
        />
      </CardContent>
    </Card>
  );
};

export default AvailabilityCard;
