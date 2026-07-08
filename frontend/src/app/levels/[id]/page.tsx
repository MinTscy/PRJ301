import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { getCefrBand } from "@/lib/design-system";

type LevelDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LevelDetailPage({ params }: LevelDetailPageProps) {
  const { id } = await params;
  const detail = await api.levelDetail(Number(id));
  const band = getCefrBand(detail.levelNumber);

  return (
    <div>
      <PageHeader
        eyebrow={`${detail.stage.languageCode} / Stage ${detail.stage.stageNumber}`}
        title={`Level ${detail.levelNumber}: ${detail.title}`}
        description="Review sub-level timing, imported content, and AI/moderator questions before using this level in a live room."
        actions={
          <Button asChild variant="outline">
            <Link href={`/levels?language=${detail.stage.languageCode}&stage=${detail.stage.stageNumber}`}>
              <ArrowLeft className="size-4" /> Back to levels
            </Link>
          </Button>
        }
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black uppercase text-muted-foreground">CEFR band</div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={band?.tone === "violet" ? "violet" : band?.tone === "coral" ? "coral" : "teal"}>
                {band?.key ?? "B1+"}
              </Badge>
              <span className="font-black">{band?.name ?? "Extension"}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {band?.outcome ?? "Extended discussion, reasoning, and guided fluency practice."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black uppercase text-muted-foreground">Duration</div>
            <div className="mt-3 text-3xl font-black">{detail.durationMinutes} min</div>
            <p className="mt-2 text-sm text-muted-foreground">{detail.subLevels.length} sub-levels imported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black uppercase text-muted-foreground">Prompt bank</div>
            <div className="mt-3 text-3xl font-black">
              {detail.subLevels.reduce((sum, item) => sum + item.aiQuestions.length, 0)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">AI/moderator questions</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        {detail.subLevels.length === 0 ? (
          <EmptyState>No sub-levels imported for this level yet.</EmptyState>
        ) : (
          detail.subLevels.map((subLevel) => (
            <Card key={subLevel.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      {subLevel.subOrder}. {subLevel.title}
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{subLevel.durationMinutes} minutes</p>
                  </div>
                  <Badge variant="outline">
                    {subLevel.contents.length} content / {subLevel.aiQuestions.length} prompts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-sm font-black uppercase text-muted-foreground">Content</h4>
                  <div className="grid gap-2">
                    {subLevel.contents.slice(0, 5).map((content) => (
                      <div key={content.id} className="rounded-md border bg-secondary/50 p-3 text-sm leading-6">
                        {content.contentText}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-muted-foreground">
                    <MessageCircleQuestion className="size-4" /> Questions
                  </h4>
                  <div className="grid gap-2">
                    {subLevel.aiQuestions.length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        No prompt imported.
                      </div>
                    ) : (
                      subLevel.aiQuestions.slice(0, 5).map((question) => (
                        <div key={question.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6">
                          {question.questionText}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <Separator className="lg:hidden" />
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
