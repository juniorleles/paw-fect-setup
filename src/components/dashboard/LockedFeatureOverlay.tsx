import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LockedFeatureOverlayProps {
  children: ReactNode;
  title: string;
  planLabel?: string;
}

const LockedFeatureOverlay = ({ children, title, planLabel = "Essencial" }: LockedFeatureOverlayProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none filter blur-[6px] opacity-60">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-lg z-10">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível a partir do plano {planLabel}
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2 mt-1"
            onClick={() => navigate("/my-account")}
          >
            <Crown className="w-4 h-4" />
            Fazer upgrade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
