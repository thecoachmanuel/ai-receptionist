import { RoleGuard } from "@/components/auth/role-guard";
import { VoiceAgentScreen } from "@/components/dashboard/voice-agent-screen";

export default function VoiceAgentPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <VoiceAgentScreen />
    </RoleGuard>
  );
}
