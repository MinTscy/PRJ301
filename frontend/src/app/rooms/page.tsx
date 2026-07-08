import { api } from "@/lib/api";
import { RoomStudio } from "./room-studio";

export default async function RoomsPage() {
  const languages = await api.languages().catch(() => []);
  const initialLanguage = languages[0]?.code ?? "EN";
  const initialLevels = await api.levelsByStage(initialLanguage, 1).catch(() => []);

  return (
    <div className="-m-4 md:-m-8">
      <RoomStudio languages={languages} initialLevels={initialLevels} initialLanguage={initialLanguage} />
    </div>
  );
}
