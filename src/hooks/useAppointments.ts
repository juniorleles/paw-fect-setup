import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerId } from "@/hooks/useOwnerId";
import type { Appointment } from "@/types/appointment";
import { subDays, format } from "date-fns";

const PAGE_SIZE = 100;
const INITIAL_PAST_DAYS = 7;

export const useAppointments = () => {
  const { user } = useAuth();
  const { ownerId } = useOwnerId();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const oldestLoadedDate = useRef<string | null>(null);

  // Fetch total count for display purposes
  const fetchTotalCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setTotalCount(count);
  }, [user]);

  // Fetch appointments from a date range
  const fetchDateRange = useCallback(async (fromDate: string, toDate?: string): Promise<Appointment[]> => {
    if (!user) return [];
    let query = supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", fromDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(PAGE_SIZE);

    if (toDate) {
      query = query.lte("date", toDate);
    }

    const { data } = await query;
    return (data as unknown as Appointment[]) ?? [];
  }, [user]);

  // Fetch older appointments (before the oldest loaded date)
  const fetchOlderPage = useCallback(async (beforeDate: string): Promise<Appointment[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .lt("date", beforeDate)
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(PAGE_SIZE);

    // Reverse to maintain ascending order
    return ((data as unknown as Appointment[]) ?? []).reverse();
  }, [user]);

  // Initial load: today - INITIAL_PAST_DAYS → all future
  const fetchInitial = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const startDate = format(subDays(new Date(), INITIAL_PAST_DAYS), "yyyy-MM-dd");
    const data = await fetchDateRange(startDate);
    
    setAppointments(data);
    oldestLoadedDate.current = startDate;

    // Check if there are older appointments
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lt("date", startDate);
    setHasMore((count ?? 0) > 0);

    await fetchTotalCount();
    setLoading(false);
  }, [user, fetchDateRange, fetchTotalCount]);

  // Load more (older) appointments
  const loadMore = useCallback(async () => {
    if (!user || !oldestLoadedDate.current || loadingMore || !hasMore) return;
    setLoadingMore(true);

    const olderData = await fetchOlderPage(oldestLoadedDate.current);
    
    if (olderData.length === 0) {
      setHasMore(false);
    } else {
      const newOldest = olderData[0]?.date;
      if (newOldest) oldestLoadedDate.current = newOldest;

      setAppointments((prev) => {
        // Merge and deduplicate by id
        const existingIds = new Set(prev.map((a) => a.id));
        const newItems = olderData.filter((a) => !existingIds.has(a.id));
        return [...newItems, ...prev];
      });

      // Check if there's even more
      if (olderData.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .lt("date", newOldest!);
        setHasMore((count ?? 0) > 0);
      }
    }

    setLoadingMore(false);
  }, [user, loadingMore, hasMore, fetchOlderPage]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const addAppointment = async (apt: Omit<Appointment, "id" | "created_at" | "updated_at" | "confirmation_message_sent_at">) => {
    const { error } = await supabase.from("appointments").insert(apt as any);
    if (!error) {
      await fetchInitial();
    }
    return { error };
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { error } = await supabase
      .from("appointments")
      .update(updates as any)
      .eq("id", id);
    if (!error) {
      // Optimistically update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      await fetchTotalCount();
    }
    return { error };
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (!error) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      await fetchTotalCount();
    }
    return { error };
  };

  return {
    appointments,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    refetch: fetchInitial,
  };
};
