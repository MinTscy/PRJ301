import Link from "next/link";
import { ArrowRight, BookOpen, Radio } from "lucide-react";
import { CEFRCard } from "@/components/cefr-card";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { cefrBands, practiceToolkit } from "@/lib/design-system";

export default async function DashboardPage() {
  const [languages, coverage] = await Promise.all([
    api.languages().catch(() => []),
    api.coverage().catch(() => [])
  ]);
  const importedLevels = coverage.reduce((sum, item) => sum + item.importedLevels, 0);
  const expectedLevels = coverage.reduce((sum, item) => sum + item.totalExpectedLevels, 0) || 1;
  const readiness = Math.round((importedLevels / expectedLevels) * 100);

  return (
    <div>
      <PageHeader
        eyebrow="LUCY LMS Frontend"
        title="A CEFR-aligned operating console for live language learning."
        description="Review data readiness, inspect the 100-level learning path, create live rooms, and support mentors with speaking-first workflows."
        actions={
          <>
            <Button asChild>
              <Link href="/levels">
                Browse levels <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/rooms">Open room studio</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Languages" value={languages.length} helper="EN, JA, ZH from Java LMS" />
        <MetricCard label="Imported levels" value={importedLevels} helper={`of ${expectedLevels} expected`} />
        <MetricCard label="Data readiness" value={`${readiness}%`} helper="Based on /api/levels/coverage" />
        <MetricCard label="Live workflow" value="Room" helper="Timeline and pinned material ready" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {cefrBands.map((band) => (
          <CEFRCard key={band.key} band={band} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Week 1-2 readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coverage.map((language) => {
              const value = Math.round((language.importedLevels / language.totalExpectedLevels) * 100);
              return (
                <div key={language.languageCode} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={language.complete ? "teal" : "coral"}>{language.languageCode}</Badge>
                        <span className="font-bold">{language.languageName}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {language.importedLevels}/{language.totalExpectedLevels} levels imported
                      </p>
                    </div>
                    <span className="text-2xl font-black">{value}%</span>
                  </div>
                  <Progress className="mt-3" value={value} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice toolkit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {practiceToolkit.map((item) => (
              <div key={item.code} className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid size-10 place-items-center rounded-xl bg-white/10 text-xs font-black text-white">
                  {item.code}
                </div>
                <div>
                  <div className="font-bold">{item.label}</div>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-lucy-teal" />
              Content library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Browse levels by language and stage, inspect sub-levels, and prepare the content shown in live rooms.
            </p>
            <Button className="mt-4" asChild variant="secondary">
              <Link href="/levels">View level map</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-5 text-lucy-coral" />
              Live room studio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Create anonymous rooms, follow timed sub-level progression, and pin slides or resource links.
            </p>
            <Button className="mt-4" asChild variant="secondary">
              <Link href="/rooms">Create a room</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
