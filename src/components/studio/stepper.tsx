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
    <nav aria-label="Tiến trình dựng agent" className="flex items-center overflow-x-auto rounded-xl border border-border bg-white px-5 py-3.5 shadow-sm">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        const reachable = canGoTo(s.n);
        return (
          <div key={s.n} className="flex flex-1 items-center gap-3 min-w-[190px]">
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
                  "grid size-[34px] shrink-0 place-items-center rounded-full text-sm font-bold",
                  active && "bg-primary text-primary-foreground shadow-glow",
                  done && "bg-success-muted text-success-strong border-2 border-success",
                  !active && !done && "bg-gray-100 text-gray-500 border-2 border-transparent",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : s.n}
              </span>
              <span className="hidden md:block">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                  {s.kicker}
                </span>
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-500",
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
                className={cn("mx-1.5 h-0.5 min-w-5 flex-1 rounded-sm", done ? "bg-success" : "bg-gray-200")}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
