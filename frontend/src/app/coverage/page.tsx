import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

export default async function CoveragePage() {
  const coverage = await api.coverage().catch(() => []);

  return (
    <div>
      <PageHeader
        eyebrow="Data readiness"
        title="Track the 100-level import target before demo or launch."
        description="This screen reads the Java LMS coverage endpoint and highlights missing stage or level data."
      />

      <section className="grid gap-5">
        {coverage.map((language) => {
          const percent = Math.round((language.importedLevels / language.totalExpectedLevels) * 100);
          return (
            <Card key={language.languageCode}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={language.complete ? "teal" : "coral"}>{language.languageCode}</Badge>
                      <CardTitle>{language.languageName}</CardTitle>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {language.importedLevels}/{language.totalExpectedLevels} levels imported
                    </p>
                  </div>
                  <div className="text-3xl font-black">{percent}%</div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={percent} />
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {language.stages.map((stage) => {
                    const stagePercent = Math.round((stage.importedLevels / stage.expectedLevels) * 100);
                    return (
                      <div key={stage.stageNumber} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-black">Stage {stage.stageNumber}</div>
                          <Badge variant={stage.complete ? "teal" : "outline"}>{stagePercent}%</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Levels {stage.expectedStartLevel}-{stage.expectedEndLevel}
                        </p>
                        <Progress className="mt-3" value={stagePercent} />
                        {stage.missingLevels > 0 ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            Missing {stage.missingLevels}: {stage.missingLevelNumbers.slice(0, 12).join(", ")}
                            {stage.missingLevelNumbers.length > 12 ? "..." : ""}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm font-semibold text-lucy-teal">Complete</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
