"use client";

import { Check } from "lucide-react";
import { STEPS, type StepNumber } from "~/hooks/use-wizard";
import { cn } from "~/lib/utils";

export function Stepper({
  current,
  onSelect,
  canGoTo,
}: {
  current: StepNumber;
  onSelect: (n: StepNumber) => void;
  canGoTo: (n: StepNumber) => boolean;
}) {
  return (
    <nav aria-label="Tiến trình dựng agent" className="flex items-center gap-2 md:gap-3">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        const reachable = canGoTo(s.n);
        return (
          <div key={s.n} className="flex flex-1 items-center gap-2 md:gap-3">
            <button
              type="button"
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(s.n)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                reachable ? "hover:bg-gray-100" : "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                  active && "bg-primary text-primary-foreground shadow-glow",
                  done && "bg-success-muted text-success-strong",
                  !active && !done && "bg-gray-100 text-gray-500",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : s.n}
              </span>
              <span className="hidden md:block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {s.kicker}
                </span>
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-fci-700" : "text-gray-700",
                  )}
                  data-active={active || undefined}
                >
                  {s.title}
                </span>
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn("h-0.5 flex-1 rounded-full", done ? "bg-success" : "bg-gray-200")}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
