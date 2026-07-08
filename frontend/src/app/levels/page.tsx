import Link from "next/link";
import { LevelCard } from "@/components/level-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

type LevelsPageProps = {
  searchParams: Promise<{ language?: string; stage?: string }>;
};

export default async function LevelsPage({ searchParams }: LevelsPageProps) {
  const params = await searchParams;
  const languages = await api.languages().catch(() => []);
  const language = params.language ?? languages[0]?.code ?? "EN";
  const stage = Number(params.stage ?? "1");
  const levels = await api.levelsByStage(language, stage).catch(() => []);

  return (
    <div>
      <PageHeader
        eyebrow="Content library"
        title="Browse the 100-level language path."
        description="Filter by language and stage, inspect level detail, and use the content for room creation and mentor guidance."
      />

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {languages.map((item) => (
              <Button key={item.code} asChild variant={item.code === language ? "default" : "outline"} size="sm">
                <Link href={`/levels?language=${item.code}&stage=${stage}`}>{item.code}</Link>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((item) => (
              <Button key={item} asChild variant={item === stage ? "default" : "outline"} size="sm">
                <Link href={`/levels?language=${language}&stage=${item}`}>Stage {item}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{language}</Badge>
          <Badge variant="outline">Stage {stage}</Badge>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">{levels.length} levels found</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {levels.map((level) => (
          <LevelCard key={level.id} level={level} />
        ))}
      </section>
    </div>
  );
}
