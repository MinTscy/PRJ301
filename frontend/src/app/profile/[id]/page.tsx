import { ProfilePanel } from "../profile-panel";

export default async function ProfileByIdPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfilePanel profileId={id} />;
}
