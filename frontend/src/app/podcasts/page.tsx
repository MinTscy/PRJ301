import { PodcastPanel } from "./podcast-panel";

type PodcastsPageProps = {
  searchParams: Promise<{ roomCode?: string }>;
};

export default async function PodcastsPage({ searchParams }: PodcastsPageProps) {
  const params = await searchParams;
  return <PodcastPanel initialRoomCode={params.roomCode ?? ""} />;
}
