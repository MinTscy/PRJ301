import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCefrBand } from "@/lib/design-system";
import type { Level } from "@/lib/api";

export function LevelCard({ level }: { level: Level }) {
  const band = getCefrBand(level.levelNumber);
  const variant = band?.tone === "violet" ? "violet" : band?.tone === "coral" ? "coral" : "teal";

  return (
    <Link href={`/levels/${level.id}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/30 hover:ring-4 hover:ring-primary/15">
        <CardContent className="flex h-full min-h-36 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-black text-white">
              {level.levelNumber}
            </span>
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex-1">
            <h3 className="line-clamp-2 font-black leading-snug text-white">{level.title}</h3>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {level.languageCode} / Stage {level.stageNumber} / {level.durationMinutes} min
            </p>
          </div>
          <div className="mt-4">
            <Badge variant={variant}>{band ? `${band.key} ${band.name}` : "Extension"}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
