"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export function RoleGuard({
  children,
  allowedRoles = ["admin"],
  fallbackPath = "staff-portal",
}: {
  children: ReactNode;
  allowedRoles?: Array<"admin" | "operator" | "member" | "viewer">;
  fallbackPath?: string;
}) {
  const router = useRouter();
  const { userRole, organization, isBootstrapping } = useWorkspace();

  const isAllowed = allowedRoles.includes(userRole);

  useEffect(() => {
    if (!isBootstrapping && !isAllowed && organization?.slug) {
      toast.error("Access restricted. Admin privileges required for this section.");
      router.replace(`/app/${organization.slug}/${fallbackPath}`);
    }
  }, [isAllowed, isBootstrapping, organization?.slug, router, fallbackPath]);

  if (isBootstrapping) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Checking permissions…</div>;
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          This area requires organization admin privileges. Redirecting to your staff portal…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
