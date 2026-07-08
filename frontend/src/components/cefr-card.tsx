import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CEFRTone = "teal" | "violet" | "coral";

const toneClasses: Record<CEFRTone, string> = {
  teal: "border-t-lucy-teal",
  violet: "border-t-lucy-violet",
  coral: "border-t-lucy-coral"
};

const badgeVariants: Record<CEFRTone, "teal" | "violet" | "coral"> = {
  teal: "teal",
  violet: "violet",
  coral: "coral"
};

type CEFRCardProps = {
  band: {
    key: string;
    name: string;
    range: string;
    tone: CEFRTone;
    outcome: string;
    activities: readonly string[];
  };
  active?: boolean;
};

export function CEFRCard({ band, active }: CEFRCardProps) {
  return (
    <Card className={cn("border-t-4", toneClasses[band.tone], active && "ring-4 ring-primary/15")}>
      <CardHeader>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Badge variant={badgeVariants[band.tone]}>{band.key}</Badge>
          <span className="text-xs font-bold text-muted-foreground">{band.range}</span>
        </div>
        <CardTitle>{band.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{band.outcome}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {band.activities.map((activity) => (
            <span key={activity} className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-bold text-muted-foreground">
              {activity}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
