import { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  );
}
