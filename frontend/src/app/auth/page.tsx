import { PageHeader } from "@/components/page-header";
import { AuthPanel } from "./auth-panel";

export default function AuthPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Identity"
        title="Login and register for LUCY accounts."
        description="Create learner, Pro mentor, or Super content accounts using the local Java auth contract and database-backed sessions."
      />
      <AuthPanel />
    </div>
  );
}
