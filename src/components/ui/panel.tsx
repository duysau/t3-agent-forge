import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * Vỏ ngoài của mỗi bước wizard, theo `.panel` của prototype (dòng 179–186).
 * Khác `Card` của shadcn ở ba điểm: bo 2xl, thân padding 32, và chân có nền
 * `gray-25` — nên tách thành bộ riêng thay vì rắc class vào `Card` ở năm chỗ.
 */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "animate-panel-fade overflow-hidden rounded-2xl border border-border bg-card shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-8 max-[640px]:p-5", className)}>{children}</div>;
}

export function PanelTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.01em]", className)}>
      {children}
    </h3>
  );
}

export function PanelSub({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 mb-6 text-[15px] text-gray-500", className)}>{children}</p>;
}

export function PanelFoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border bg-gray-25 px-8 py-5 max-[640px]:px-5 max-[640px]:py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
