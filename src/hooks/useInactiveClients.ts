import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingData } from "@/types/onboarding";

export interface InactiveClient {
  ownerName: string;
  ownerPhone: string;
  lastAppointmentDate: string;
  daysSinceLastVisit: number;
  totalAppointments: number;
  mostFrequentService: string;
  avgTicket: number;
  hasFutureAppointment: boolean;
}

interface UseInactiveClientsOptions {
  daysThreshold: number;
}

export const useInactiveClients = ({ daysThreshold }: UseInactiveClientsOptions) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const [aptsRes, configRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("owner_name, owner_phone, date, service, status")
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
        supabase
          .from("pet_shop_configs")
          .select("services")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);
      setAppointments(aptsRes.data ?? []);
      setServices((configRes.data?.services as any) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const priceMap = useMemo(() => new Map(services.map((s) => [s.name, s.price ?? 0])), [services]);
  const todayStr = new Date().toISOString().split("T")[0];

  const clients = useMemo(() => {
    if (loading) return [];

    // Group by phone
    const byPhone = new Map<string, typeof appointments>();
    for (const a of appointments) {
      const key = a.owner_phone;
      if (!key) continue;
      if (!byPhone.has(key)) byPhone.set(key, []);
      byPhone.get(key)!.push(a);
    }

    const result: InactiveClient[] = [];
    const now = new Date();

    byPhone.forEach((apts, phone) => {
      const completed = apts.filter((a: any) => a.status === "completed");
      if (completed.length === 0) return; // needs at least 1 completed

      const hasFuture = apts.some((a: any) => a.date > todayStr && a.status !== "cancelled");
      if (hasFuture) return; // exclude clients with future appointments

      // Find last completed date
      const lastDate = completed.reduce((max: string, a: any) => (a.date > max ? a.date : max), "1900-01-01");
      const daysSince = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince < daysThreshold) return;

      // Most frequent service
      const serviceCount = new Map<string, number>();
      completed.forEach((a: any) => {
        serviceCount.set(a.service, (serviceCount.get(a.service) ?? 0) + 1);
      });
      const mostFrequent = [...serviceCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

      // Avg ticket
      const totalValue = completed.reduce((sum: number, a: any) => sum + (priceMap.get(a.service) ?? 0), 0);
      const avgTicket = completed.length > 0 ? totalValue / completed.length : 0;

      result.push({
        ownerName: apts[0].owner_name,
        ownerPhone: phone,
        lastAppointmentDate: lastDate,
        daysSinceLastVisit: daysSince,
        totalAppointments: completed.length,
        mostFrequentService: mostFrequent,
        avgTicket,
        hasFutureAppointment: false,
      });
    });

    return result.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
  }, [appointments, loading, daysThreshold, priceMap, todayStr]);

  const potentialRevenue = useMemo(
    () => clients.reduce((sum, c) => sum + c.avgTicket, 0),
    [clients]
  );

  return { clients, loading, potentialRevenue };
};
