import { api } from "@/lib/api";
import { RoomStudio } from "./room-studio";

type RoomsPageProps = {
  searchParams: Promise<{ roomCode?: string }>;
};

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = await searchParams;
  const languages = await api.languages().catch(() => []);
  const initialLanguage = languages[0]?.code ?? "EN";
  const initialLevels = await api.levelsByStage(initialLanguage, 1).catch(() => []);

  return (
    <div className="-m-4 md:-m-8">
      <RoomStudio
        languages={languages}
        initialLevels={initialLevels}
        initialLanguage={initialLanguage}
        initialRoomCode={params.roomCode ?? ""}
      />
    </div>
  );
}
