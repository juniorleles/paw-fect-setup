import { STEP_LABELS } from "@/types/onboarding";
import { Check } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const ProgressBar = ({ currentStep, completedSteps, onStepClick }: ProgressBarProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-8" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary mx-8 transition-all duration-500"
          style={{ width: `${(Math.max(0, currentStep - 1) / 4) * (100 - 12)}%` }}
        />

        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(stepNum);
          const isCurrent = currentStep === stepNum;
          const isClickable = isCompleted || stepNum <= Math.max(...completedSteps, 0) + 1;

          return (
            <button
              key={stepNum}
              onClick={() => isClickable && onStepClick(stepNum)}
              disabled={!isClickable}
              className="relative z-10 flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isCurrent
                    ? "bg-primary text-primary-foreground shadow-lg scale-110 ring-4 ring-primary/20"
                    : "bg-secondary text-muted-foreground"
                } ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-not-allowed"}`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
              </div>
              <span
                className={`text-xs font-semibold transition-colors ${
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
