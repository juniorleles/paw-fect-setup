import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Appointment } from "@/types/appointment";

export const useAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setAppointments((data as unknown as Appointment[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const addAppointment = async (apt: Omit<Appointment, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("appointments").insert(apt as any);
    if (!error) await fetchAppointments();
    return { error };
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { error } = await supabase
      .from("appointments")
      .update(updates as any)
      .eq("id", id);
    if (!error) await fetchAppointments();
    return { error };
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (!error) await fetchAppointments();
    return { error };
  };

  const todayCount = appointments.filter((a) => a.date === new Date().toISOString().split("T")[0] && a.status !== "cancelled").length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  return {
    appointments,
    loading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    todayCount,
    confirmedCount,
    pendingCount,
    refetch: fetchAppointments,
  };
};
