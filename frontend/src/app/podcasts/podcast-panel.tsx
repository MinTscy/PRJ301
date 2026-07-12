"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  Headphones,
  LoaderCircle,
  Pause,
  Play,
  Podcast,
  Radio,
  RefreshCw,
  Search,
  UserRound,
  X
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PodcastRecording } from "@/lib/api";
import { podcastAudioUrl, realtimeApi } from "@/lib/realtime";

function formatDuration(seconds: number | null) {
  if (!seconds) return "Unknown length";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function roomLabel(value: string) {
  return value.trim().toUpperCase();
}

type PodcastPanelProps = {
  initialRoomCode?: string;
};

export function PodcastPanel({ initialRoomCode = "" }: PodcastPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [podcasts, setPodcasts] = useState<PodcastRecording[]>([]);
  const normalizedInitialRoomCode = roomLabel(initialRoomCode);
  const [roomCode, setRoomCode] = useState(normalizedInitialRoomCode);
  const [activeRoomCode, setActiveRoomCode] = useState(normalizedInitialRoomCode);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activePodcast = useMemo(
    () => podcasts.find((podcast) => podcast.id === playingId) ?? null,
    [playingId, podcasts]
  );
  const activeAudioUrl = activePodcast ? podcastAudioUrl(activePodcast) : null;
  const totalMinutes = podcasts.reduce((sum, podcast) => sum + (podcast.durationSeconds ?? 0), 0);

  const loadPodcasts = useCallback(async (nextRoomCode: string) => {
    setLoading(true);
    setError(null);
    try {
      setPodcasts(await realtimeApi.podcasts(nextRoomCode || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load podcasts.");
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPodcasts(normalizedInitialRoomCode);
  }, [loadPodcasts, normalizedInitialRoomCode]);

  useEffect(() => {
    if (!audioRef.current || !activeAudioUrl) return;
    audioRef.current.load();
    void audioRef.current.play().catch(() => undefined);
  }, [activeAudioUrl]);

  function submitFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = roomLabel(roomCode);
    setActiveRoomCode(next);
    void loadPodcasts(next);
  }

  function clearFilter() {
    setRoomCode("");
    setActiveRoomCode("");
    void loadPodcasts("");
  }

  function togglePodcast(podcast: PodcastRecording) {
    const audio = audioRef.current;
    if (playingId === podcast.id && audio && !audio.paused) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(podcast.id);
  }

  return (
    <div>
      <PageHeader
        eyebrow="LUCY Podcast"
        title="Replay published live lessons."
        description="Listen to recordings from Super and Pro rooms, filter by room code, and keep the learning thread moving after class."
        actions={
          <Button variant="outline" onClick={() => loadPodcasts(activeRoomCode)} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Podcast className="size-5" />
              </div>
              <span className="text-3xl font-black text-white">{podcasts.length}</span>
            </div>
            <div className="mt-4 font-black text-white">Episodes</div>
            <p className="mt-1 text-sm text-muted-foreground">Published recordings ready to play</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-secondary/15 text-secondary">
                <Headphones className="size-5" />
              </div>
              <span className="text-3xl font-black text-white">{Math.round(totalMinutes / 60)}</span>
            </div>
            <div className="mt-4 font-black text-white">Minutes</div>
            <p className="mt-1 text-sm text-muted-foreground">Recorded learning time in this view</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <Radio className="size-5" />
              </div>
              <span className="max-w-[9rem] truncate text-3xl font-black text-white">
                {activeRoomCode || "All"}
              </span>
            </div>
            <div className="mt-4 font-black text-white">Room filter</div>
            <p className="mt-1 text-sm text-muted-foreground">Search one live room or browse all</p>
          </CardContent>
        </Card>
      </section>

      <Card className="mb-5">
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitFilter}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="Room code, for example LUCY-12345678"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                <Search className="size-4" />
                Search
              </Button>
              {activeRoomCode ? (
                <Button type="button" variant="outline" onClick={clearFilter}>
                  <X className="size-4" />
                  Clear
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {activePodcast && activeAudioUrl ? (
        <Card className="mb-5 border-primary/30 bg-primary/10">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/20 text-primary">
                <Headphones className="size-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Now playing</p>
                <h2 className="mt-1 truncate text-xl font-black text-white">{activePodcast.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activePodcast.creatorDisplayName} · {activePodcast.roomCode}
                </p>
              </div>
              <audio
                ref={audioRef}
                className="w-full lg:max-w-md"
                controls
                onPause={() => setPlayingId(null)}
                onEnded={() => setPlayingId(null)}
              >
                <source src={activeAudioUrl} type={activePodcast.contentType ?? undefined} />
              </audio>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid min-h-56 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="text-center">
            <LoaderCircle className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">Loading podcasts...</p>
          </div>
        </div>
      ) : podcasts.length === 0 ? (
        <EmptyState>
          No published podcasts found{activeRoomCode ? ` for ${activeRoomCode}` : ""}.
        </EmptyState>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {podcasts.map((podcast) => {
            const audioUrl = podcastAudioUrl(podcast);
            const playing = playingId === podcast.id;
            return (
              <Card key={podcast.id} className={playing ? "border-primary/40 bg-primary/10" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{podcast.title}</CardTitle>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{podcast.roomCode}</Badge>
                        <Badge variant="outline">{formatDuration(podcast.durationSeconds)}</Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      disabled={!audioUrl}
                      onClick={() => togglePodcast(podcast)}
                      aria-label={playing ? `Pause ${podcast.title}` : `Play ${podcast.title}`}
                    >
                      {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserRound className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{podcast.creatorDisplayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-4 shrink-0 text-secondary" />
                      <span>{formatDate(podcast.completedAt ?? podcast.createdAt)}</span>
                    </div>
                  </div>
                  {audioUrl ? (
                    <Button asChild className="mt-4" variant="outline" size="sm">
                      <a href={audioUrl} target="_blank" rel="noreferrer">
                        Open audio
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  ) : (
                    <p className="mt-4 text-sm text-amber-300">Audio is not available for this episode.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
