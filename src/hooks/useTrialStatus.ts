import { useMemo } from "react";
import { useSubscription } from "@/hooks/useSubscription";

export type TrialPhase =
  | "trial_active"      // Quotas not exhausted
  | "trial_expiring"    // 80%+ of any quota used
  | "blocked"           // Any quota fully used
  | "active"            // Paid subscription active
  | "cancelled";        // Subscription cancelled

export interface TrialStatusInfo {
  phase: TrialPhase;
  appointmentsUsed: number;
  appointmentsLimit: number;
  messagesUsed: number;
  messagesLimit: number;
  appointmentsPercent: number;
  messagesPercent: number;
  isBlocked: boolean;
  isTrialExpiring: boolean;
  showUpgradeRequired: boolean;
  canSendMessages: boolean;
  canCreateAppointments: boolean;
  loading: boolean;
  // Legacy compat
  daysLeft: number;
  daysOverdue: number;
  trialEndAt: Date | null;
  isGracePeriod: boolean;
}

export const useTrialStatus = (): TrialStatusInfo => {
  const {
    status, trialEndAt, loading,
    trialAppointmentsUsed, trialMessagesUsed,
    trialAppointmentsLimit, trialMessagesLimit,
  } = useSubscription();

  return useMemo(() => {
    const now = new Date();
    const trialEnd = trialEndAt ? new Date(trialEndAt) : null;

    const aptsPercent = trialAppointmentsLimit > 0 ? (trialAppointmentsUsed / trialAppointmentsLimit) * 100 : 0;
    const msgsPercent = trialMessagesLimit > 0 ? (trialMessagesUsed / trialMessagesLimit) * 100 : 0;

    const base = {
      appointmentsUsed: trialAppointmentsUsed,
      appointmentsLimit: trialAppointmentsLimit,
      messagesUsed: trialMessagesUsed,
      messagesLimit: trialMessagesLimit,
      appointmentsPercent: aptsPercent,
      messagesPercent: msgsPercent,
      daysLeft: 0,
      daysOverdue: 0,
      trialEndAt: trialEnd,
      isGracePeriod: false,
      loading,
    };

    // Active paid subscription — full access
    if (status === "active" && trialEnd && trialEnd < now) {
      return {
        ...base,
        phase: "active" as TrialPhase,
        isBlocked: false,
        isTrialExpiring: false,
        showUpgradeRequired: false,
        canSendMessages: true,
        canCreateAppointments: true,
      };
    }

    // Cancelled
    if (status === "cancelled") {
      return {
        ...base,
        phase: "cancelled" as TrialPhase,
        isBlocked: true,
        isTrialExpiring: false,
        showUpgradeRequired: false,
        canSendMessages: false,
        canCreateAppointments: false,
      };
    }

    // No subscription at all
    if (status === "none") {
      return {
        ...base,
        phase: "blocked" as TrialPhase,
        isBlocked: true,
        isTrialExpiring: false,
        showUpgradeRequired: true,
        canSendMessages: false,
        canCreateAppointments: false,
      };
    }

    // Quota-based logic (works for both trial and paid plans)
    // -1 means unlimited (e.g., appointments on Essencial)
    const aptsExhausted = trialAppointmentsLimit !== -1 && trialAppointmentsUsed >= trialAppointmentsLimit;
    const msgsExhausted = trialMessagesLimit > 0 && trialMessagesUsed >= trialMessagesLimit;
    const quotaExhausted = aptsExhausted || msgsExhausted;

    if (quotaExhausted) {
      return {
        ...base,
        phase: "blocked" as TrialPhase,
        isBlocked: true,
        isTrialExpiring: false,
        showUpgradeRequired: true,
        canSendMessages: !msgsExhausted,
        canCreateAppointments: !aptsExhausted,
      };
    }

    const isExpiring = aptsPercent >= 80 || msgsPercent >= 80;

    return {
      ...base,
      phase: isExpiring ? "trial_expiring" : "trial_active",
      isBlocked: false,
      isTrialExpiring: isExpiring,
      showUpgradeRequired: false,
      canSendMessages: true,
      canCreateAppointments: true,
    };
  }, [status, trialEndAt, loading, trialAppointmentsUsed, trialMessagesUsed, trialAppointmentsLimit, trialMessagesLimit]);
};
