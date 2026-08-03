"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/context";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import {
  dashboardApi,
  defaultTerminology,
  normalizeTerminology,
  type Organization,
  type Terminology,
} from "@/components/dashboard/data";

type WorkspaceContextValue = {
  orgSlug: string;
  organization: Organization | null;
  terminology: Terminology;
  isBootstrapping: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  const { organization: activeOrg, isLoaded } = useAuth();
  const fetchedOrg = useQuery<Organization | null>(
    dashboardApi.organizations.current,
    {},
    { initialData: activeOrg as any },
  );
  const organization = fetchedOrg ?? (activeOrg as any) ?? null;

  const bootstrapCurrent = useMutation<
    { name?: string; timezone?: string; locale?: string },
    Organization
  >(dashboardApi.organizations.bootstrapCurrent);
  const requestedBootstrap = useRef(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (
      !isLoaded ||
      !activeOrg ||
      organization !== null ||
      requestedBootstrap.current
    ) {
      return;
    }

    requestedBootstrap.current = true;
    setIsCreating(true);
    void bootstrapCurrent({
      name: activeOrg.name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
    }).finally(() => setIsCreating(false));
  }, [
    activeOrg,
    bootstrapCurrent,
    isLoaded,
    organization,
    orgSlug,
  ]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      orgSlug,
      organization,
      terminology: organization?.terminology
        ? normalizeTerminology(organization.terminology)
        : defaultTerminology,
      isBootstrapping: (!isLoaded && organization === null) || isCreating,
    }),
    [isCreating, isLoaded, organization, orgSlug],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return value;
}
