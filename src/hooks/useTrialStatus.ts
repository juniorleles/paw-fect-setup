import { useMemo } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { differenceInDays, differenceInHours } from "date-fns";

export type TrialPhase =
  | "trial_active"      // Days 1-7: full access
  | "trial_expiring"    // Days 5-7: warning shown
  | "grace_period"      // Days 8-10: limited access
  | "blocked"           // Day 10+: no access
  | "active"            // Paid subscription active
  | "cancelled";        // Subscription cancelled

export interface TrialStatusInfo {
  phase: TrialPhase;
  daysLeft: number;
  daysOverdue: number;
  trialEndAt: Date | null;
  isBlocked: boolean;
  isGracePeriod: boolean;
  isTrialExpiring: boolean;
  showUpgradeRequired: boolean;
  canSendMessages: boolean;
  canCreateAppointments: boolean;
  loading: boolean;
}

const GRACE_PERIOD_DAYS = 3;

export const useTrialStatus = (): TrialStatusInfo => {
  const { status, trialEndAt, loading } = useSubscription();

  return useMemo(() => {
    const now = new Date();
    const trialEnd = trialEndAt ? new Date(trialEndAt) : null;

    // Active paid subscription — full access
    if (status === "active" && trialEnd && trialEnd < now) {
      return {
        phase: "active",
        daysLeft: 0,
        daysOverdue: 0,
        trialEndAt: trialEnd,
        isBlocked: false,
        isGracePeriod: false,
        isTrialExpiring: false,
        showUpgradeRequired: false,
        canSendMessages: true,
        canCreateAppointments: true,
        loading,
      };
    }

    // Cancelled
    if (status === "cancelled") {
      return {
        phase: "cancelled",
        daysLeft: 0,
        daysOverdue: 0,
        trialEndAt: trialEnd,
        isBlocked: true,
        isGracePeriod: false,
        isTrialExpiring: false,
        showUpgradeRequired: false,
        canSendMessages: false,
        canCreateAppointments: false,
        loading,
      };
    }

    // No trial date — treat as no subscription
    if (!trialEnd) {
      return {
        phase: "blocked",
        daysLeft: 0,
        daysOverdue: 0,
        trialEndAt: null,
        isBlocked: true,
        isGracePeriod: false,
        isTrialExpiring: false,
        showUpgradeRequired: true,
        canSendMessages: false,
        canCreateAppointments: false,
        loading,
      };
    }

    const daysUntilEnd = differenceInDays(trialEnd, now);
    const daysAfterEnd = differenceInDays(now, trialEnd);

    // Trial still active
    if (now < trialEnd) {
      const isExpiring = daysUntilEnd <= 2; // last 2 days warning
      return {
        phase: isExpiring ? "trial_expiring" : "trial_active",
        daysLeft: Math.max(0, daysUntilEnd),
        daysOverdue: 0,
        trialEndAt: trialEnd,
        isBlocked: false,
        isGracePeriod: false,
        isTrialExpiring: isExpiring,
        showUpgradeRequired: false,
        canSendMessages: true,
        canCreateAppointments: true,
        loading,
      };
    }

    // Trial ended — check grace period (3 days)
    if (daysAfterEnd <= GRACE_PERIOD_DAYS) {
      return {
        phase: "grace_period",
        daysLeft: 0,
        daysOverdue: daysAfterEnd,
        trialEndAt: trialEnd,
        isBlocked: false,
        isGracePeriod: true,
        isTrialExpiring: false,
        showUpgradeRequired: false,
        canSendMessages: false, // can't send messages during grace
        canCreateAppointments: true, // can still view/create appointments
        loading,
      };
    }

    // Blocked — past grace period
    return {
      phase: "blocked",
      daysLeft: 0,
      daysOverdue: daysAfterEnd,
      trialEndAt: trialEnd,
      isBlocked: true,
      isGracePeriod: false,
      isTrialExpiring: false,
      showUpgradeRequired: true,
      canSendMessages: false,
      canCreateAppointments: false,
      loading,
    };
  }, [status, trialEndAt, loading]);
};
