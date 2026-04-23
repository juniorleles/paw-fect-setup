import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerId } from "@/hooks/useOwnerId";

const DISMISS_KEY = "meta_payment_banner_dismissed_at";
const DISMISS_DAYS = 7;

/**
 * Shows a friendly reminder when the user has Meta WhatsApp connected
 * but has NOT attached MagicZap's credit line (Model A — client pays Meta).
 * Guides the user to register a payment method in Meta Business Manager
 * so reminder/campaign templates don't fail silently.
 */
const MetaPaymentBanner = () => {
  const navigate = useNavigate();
  const { ownerId } = useOwnerId();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ownerId) return;

    // Respect dismissal for 7 days
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("pet_shop_configs")
        .select("whatsapp_status, meta_phone_number_id, meta_credit_attached")
        .eq("user_id", ownerId)
        .maybeSingle();

      // Show only when:
      //  - WhatsApp is connected via Meta (has phone_number_id)
      //  - status is connected
      //  - MagicZap's credit line is NOT attached (Model A)
      if (
        data?.whatsapp_status === "connected" &&
        data?.meta_phone_number_id &&
        !data?.meta_credit_attached
      ) {
        setShow(true);
      }
    };
    check();
  }, [ownerId]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="border-none shadow-lg bg-gradient-to-r from-accent/20 via-accent/10 to-transparent overflow-hidden relative">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar aviso"
        className="absolute top-3 right-3 p-1 rounded-md hover:bg-foreground/10 text-muted-foreground transition"
      >
        <X className="w-4 h-4" />
      </button>
      <CardContent className="py-5 px-5 pr-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground">
                Ative lembretes e campanhas automáticas
              </p>
              <p className="text-sm text-muted-foreground">
                Para enviar lembretes de agendamento e campanhas de reativação,
                cadastre um cartão na Meta. Leva 2 minutos.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/cadastrar-cartao-meta")}
            className="gap-2 self-start sm:self-center flex-shrink-0"
          >
            Ver tutorial
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetaPaymentBanner;
