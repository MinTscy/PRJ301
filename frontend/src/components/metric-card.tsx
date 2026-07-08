import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <div className="mt-3 text-3xl font-black text-white">{value}</div>
        {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
