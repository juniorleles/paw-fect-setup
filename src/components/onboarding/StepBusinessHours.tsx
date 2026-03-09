import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData, DaySchedule } from "@/types/onboarding";
import { Clock, Copy, Users, Lock, Coffee, Plus, X, Info } from "lucide-react";
import { STRIPE_PLANS } from "@/config/stripe";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  plan?: string;
}

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const DAY_ABBR: Record<string, string> = {
  "Segunda-feira": "Seg",
  "Terça-feira": "Ter",
  "Quarta-feira": "Qua",
  "Quinta-feira": "Qui",
  "Sexta-feira": "Sex",
  "Sábado": "Sáb",
  "Domingo": "Dom",
};

const StepBusinessHours = ({ data, onChange, plan }: Props) => {
  const planKey = plan === "professional" ? "professional" : plan === "starter" ? "starter" : "free";
  const maxAllowed = STRIPE_PLANS[planKey].maxAttendants;
  const isUnlimited = maxAllowed === -1;

  const attendants = data.attendants?.length ? data.attendants : [""];

  const updateAttendant = (index: number, value: string) => {
    const updated = [...attendants];
    updated[index] = value;
    onChange({ attendants: updated, maxConcurrentAppointments: updated.filter((n) => n.trim()).length || 1 });
  };

  const addAttendant = () => {
    if (!isUnlimited && attendants.length >= maxAllowed) return;
    const updated = [...attendants, ""];
    onChange({ attendants: updated });
  };

  const removeAttendant = (index: number) => {
    if (attendants.length <= 1) return;
    const updated = attendants.filter((_, i) => i !== index);
    onChange({ attendants: updated, maxConcurrentAppointments: updated.filter((n) => n.trim()).length || 1 });
  };

  const canAddMore = isUnlimited || attendants.length < maxAllowed;

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    const hours = [...data.businessHours];
    hours[index] = { ...hours[index], ...updates };
    onChange({ businessHours: hours });
  };

  const copyToAll = () => {
    const first = data.businessHours.find((d) => d.isOpen);
    if (!first) return;
    onChange({
      businessHours: data.businessHours.map((d) => ({
        ...d,
        openTime: first.openTime,
        closeTime: first.closeTime,
        openTime2: first.openTime2,
        closeTime2: first.closeTime2,
        isOpen: true,
      })),
    });
  };

  const hasLunchBreak = (day: DaySchedule) => !!day.openTime2;

  const toggleLunchBreak = (index: number) => {
    const day = data.businessHours[index];
    if (hasLunchBreak(day)) {
      updateDay(index, { openTime2: undefined, closeTime2: undefined });
    } else {
      updateDay(index, { openTime2: "13:00", closeTime2: day.closeTime || "18:00" });
      updateDay(index, { closeTime: "12:00" });
    }
  };

  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-3">
          <Clock className="w-8 h-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-display">Horário de Funcionamento</CardTitle>
        <CardDescription className="text-base">
          Configure os dias e horários de atendimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* Atendentes */}
        <div className="p-3 rounded-xl bg-secondary space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-semibold">Atendentes</Label>
              <p className="text-xs text-muted-foreground">Adicione os profissionais que atendem</p>
            </div>
          </div>

          <div className="space-y-2">
            {attendants.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Nome do atendente ${i + 1}`}
                  value={name}
                  onChange={(e) => updateAttendant(i, e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                {attendants.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeAttendant(i)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {canAddMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAttendant}
              className="w-full gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar atendente
            </Button>
          )}

          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>
              {attendants.filter((n) => n.trim()).length || 1} atendente{(attendants.filter((n) => n.trim()).length || 1) > 1 ? "s" : ""} = {attendants.filter((n) => n.trim()).length || 1} atendimento{(attendants.filter((n) => n.trim()).length || 1) > 1 ? "s" : ""} simultâneo{(attendants.filter((n) => n.trim()).length || 1) > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {!isUnlimited && !canAddMore && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span>
              {planKey === "free"
                ? <>Plano Free permite até 2 atendentes. <strong>Faça upgrade para o Essencial</strong> para ter até 5.</>
                : <>Plano Essencial permite até 5 atendentes. <strong>Faça upgrade para o Pro</strong> para ilimitado.</>
              }
            </span>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={copyToAll} className="w-full mb-2">
          <Copy className="w-4 h-4 mr-2" />
          Copiar horário para todos os dias
        </Button>

        {data.businessHours.map((day, i) => (
          <div
            key={day.day}
            className={`p-3 rounded-xl transition-colors space-y-2 ${
              day.isOpen ? "bg-secondary" : "bg-muted/50"
            }`}
          >
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
              <Switch
                checked={day.isOpen}
                onCheckedChange={(checked) => updateDay(i, { isOpen: checked })}
              />
              <span className={`font-semibold text-sm min-w-[36px] sm:min-w-[100px] ${!day.isOpen ? "text-muted-foreground" : ""}`}>
                <span className="sm:hidden">{DAY_ABBR[day.day] ?? day.day}</span>
                <span className="hidden sm:inline">{day.day}</span>
              </span>
              {day.isOpen ? (
                <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0">
                  <select
                    value={day.openTime}
                    onChange={(e) => updateDay(i, { openTime: e.target.value })}
                    className="h-9 rounded-md border border-input bg-background px-1 sm:px-2 text-xs sm:text-sm w-[68px] sm:w-auto"
                  >
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-muted-foreground text-xs sm:text-sm">às</span>
                  <select
                    value={day.closeTime}
                    onChange={(e) => updateDay(i, { closeTime: e.target.value })}
                    className="h-9 rounded-md border border-input bg-background px-1 sm:px-2 text-xs sm:text-sm w-[68px] sm:w-auto"
                  >
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ) : (
                <span className="ml-auto text-sm text-muted-foreground italic">Fechado</span>
              )}
            </div>

            {/* Lunch break / second shift */}
            {day.isOpen && (
              <div className="ml-8 sm:ml-12 space-y-2">
                <label
                  className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => toggleLunchBreak(i)}
                >
                  <Checkbox checked={hasLunchBreak(day)} className="h-3.5 w-3.5" />
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Intervalo (almoço)</span>
                </label>
                {hasLunchBreak(day) && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <select
                      value={day.openTime2 || "13:00"}
                      onChange={(e) => updateDay(i, { openTime2: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-1 sm:px-2 text-xs w-[68px] sm:w-auto"
                    >
                      {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-muted-foreground text-xs">às</span>
                    <select
                      value={day.closeTime2 || "18:00"}
                      onChange={(e) => updateDay(i, { closeTime2: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-1 sm:px-2 text-xs w-[68px] sm:w-auto"
                    >
                      {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default StepBusinessHours;
