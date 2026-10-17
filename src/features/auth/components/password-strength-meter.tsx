import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/cn";

import { PASSWORD_HINT } from "../auth-content";
import { PASSWORD_STRENGTH_LABELS, passwordStrength } from "../password-strength";

/** 3-segment strength bar + the "At least 8 characters" rule (Stitch sign-up). */
export function PasswordStrengthMeter({ password }: Readonly<{ password: string }>) {
  const strength = passwordStrength(password);
  const meetsRule = strength > 0;
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="grid grid-cols-3 gap-1.5" aria-hidden>
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={cn("h-1 rounded-full", strength >= segment ? "bg-gold" : "bg-sand")}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-body-sm">
        <span
          className={cn("flex items-center gap-1.5", meetsRule ? "text-graphite" : "text-plum")}
        >
          <CheckCircle2
            aria-hidden
            className={cn("size-3.5", meetsRule ? "text-[#2E604A]" : "text-plum/60")}
          />
          {PASSWORD_HINT}
        </span>
        {password && (
          <span className="text-gold-deep">
            <span className="sr-only">Password strength: </span>
            {PASSWORD_STRENGTH_LABELS[strength]}
          </span>
        )}
      </div>
    </div>
  );
}
