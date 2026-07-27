import { OrganizationList } from "@/components/auth/org-switcher";
import { AuthShell } from "@/components/auth-shell";

export default function ChooseOrganizationPage() {
  return (
    <AuthShell eyebrow="One last step" title="Choose where you’re working">
      <OrganizationList />
    </AuthShell>
  );
}
